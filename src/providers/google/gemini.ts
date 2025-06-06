import {
  FunctionCallingConfigMode,
  type FunctionDeclaration,
  FunctionResponse,
  GoogleGenAI,
  Type as ParamType,
  SendMessageParameters,
} from "@google/genai";
import SYSTEM_PROMPT from "src/prompt";
import * as genAiFunctions from "src/functions";

const googleGenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "read_files",
    description:
      "Reads the content of one or more source code files using file paths or glob patterns.",
    parameters: {
      type: ParamType.OBJECT,
      properties: {
        path: {
          type: ParamType.STRING,
          description:
            "A file path or glob pattern. Files ignored by .gitignore will be skipped. Examples: 'src/**/*.ts', 'README.md'",
        },
      },
      required: ["path"],
    },
  },

  {
    name: "list_files",
    description:
      "Recursively lists all files in a directory, excluding any files or folders ignored by .gitignore. Returns paths relative to the project root.",
    parameters: {
      type: ParamType.OBJECT,
      properties: {
        path: {
          type: ParamType.STRING,
          description:
            "The directory to search, relative to the root of the repository. Example: 'src/'",
        },
      },
      required: ["path"],
    },
  },

  {
    name: "write_file",
    description:
      "Writes or updates a single file in the codebase. Automatically creates any necessary parent folders.",
    parameters: {
      type: ParamType.OBJECT,
      properties: {
        path: {
          type: ParamType.STRING,
          description:
            "The file path to write (relative to the project root). Example: 'src/utils/add.ts'",
        },
        content: {
          type: ParamType.STRING,
          description: "The content to write into the file",
        },
      },
      required: ["path", "content"],
    },
  },

  {
    name: "delete_file",
    description:
      "Deletes a file from the codebase. If the file doesn't exist, the operation is silently ignored.",
    parameters: {
      type: ParamType.OBJECT,
      properties: {
        path: {
          type: ParamType.STRING,
          description:
            "The path to the file to delete (relative to the project root). Example: 'src/obsolete/module.ts'",
        },
      },
      required: ["path"],
    },
  },

  {
    name: "update_tasks",
    description:
      "Writes the updated AI tasks list to the dedicated file and clears the User tasks. Run this before at least once before final commit.",
    parameters: {
      type: ParamType.OBJECT,
      properties: {
        tasks: {
          type: ParamType.STRING,
          description:
            "The text to write to the tasks file. Each task should take one line and typically include: an incremental number, a description, and a set of suggested files that should be updated to fulfill the task.",
        },
      },
      required: ["tasks"],
    },
  },

  {
    name: "commit",
    description:
      "Commits the changes made to the codebase, creating a new commit with the provided commit message. Upon calling this function, no more updates will be allowed, and the improvement cycle will end.",
    parameters: {
      type: ParamType.OBJECT,
      properties: {
        message: {
          type: ParamType.STRING,
          description:
            "The commit message. The first line should be a concise title in imperative mood. If helpful, follow with a short paragraph describing the changes in more detail. Follow best practices for commit messages.",
        },
      },
      required: ["message"],
    },
  },
];

/**
 * Initialize the Generative AI model.
 *
 * @returns Generative AI model.
 */
function _initGenerativeModel() {
  const generativeModel = googleGenAI.chats.create({
    model: "gemini-2.0-flash",

    config: {
      systemInstruction: SYSTEM_PROMPT,

      // Specify the function declaration.
      tools: [{ functionDeclarations }],
      toolConfig: {
        functionCallingConfig: {
          // Only allow function calls (no text mode)
          mode: FunctionCallingConfigMode.ANY,
        },
      },
    },
  });

  return generativeModel;
}

/**
 * Let AI Agent work on tasks by executing function calls.
 *
 * @param tasks - Set of tasks the AI Agent should work on.
 * @param maxCalls - Max number of function calls to be executed.
 * @returns Commit message.
 */
async function workOnTasks(tasks: string, maxCalls = 15): Promise<string> {
  // Init chat
  const aiChat = _initGenerativeModel();

  let outCommitMessage: string | undefined;

  let message: SendMessageParameters["message"] = tasks;

  // Iteratively trigger Agent and execute function calls
  for (let callCount = 0; callCount < maxCalls; callCount++) {
    // Send the message to the model
    const response = await aiChat.sendMessage({ message });

    if (!response.functionCalls || response.functionCalls.length === 0) break;

    const functionReponse = await Promise.all(
      response.functionCalls.map((fc) => {
        // Commit should be the last function call, clear previous commit messages
        outCommitMessage = undefined;

        switch (fc.name) {
          case "read_files":
            return genAiFunctions.readFiles((fc.args as { path: string }).path);
          case "list_files":
            return genAiFunctions.listFiles((fc.args as { path: string }).path);
          case "write_file":
            return genAiFunctions.writeFile(
              (fc.args as { path: string; content: string }).path,
              (fc.args as { path: string; content: string }).content,
            );
          case "delete_file":
            return genAiFunctions.deleteFile(
              (fc.args as { path: string }).path,
            );
          case "update_tasks":
            return genAiFunctions.updateTasks(
              (fc.args as { tasks: string }).tasks,
            );
          case "commit":
            outCommitMessage = (fc.args as { message: string }).message;
            return outCommitMessage;
        }
      }),
    );

    // End if commit was called
    if (outCommitMessage) break;

    const functionParts: FunctionResponse[] = functionReponse.map((fr, idx) => {
      return {
        name: response.functionCalls![idx].name,
        response: { output: fr },
      };
    });

    message = functionParts.map((fr) => ({ functionResponse: fr }));
  }

  if (!outCommitMessage) {
    // Force generation of commit message
    const response = await aiChat.sendMessage({
      message:
        "Use the 'commit' function to generate a commit message for the changes made.",
    });

    outCommitMessage = (
      (response.functionCalls?.[0]?.args ?? {}) as { message?: string }
    ).message;
  }

  return outCommitMessage ?? "";
}

const genAI = {
  workOnTasks,
};
export { genAI };
