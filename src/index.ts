#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import WebSocket from 'ws';

/**
 * Type alias for a note object.
 */
type Note = { title: string, content: string };

/**
 * Simple in-memory storage for notes.
 * In a real implementation, this would likely be backed by a database.
 */
const notes: { [id: string]: Note } = {
  "1": { title: "First Note", content: "This is note 1" },
  "2": { title: "Second Note", content: "This is note 2" }
};

// CameraData
interface CameraData {
  /** 相机三维坐标及高度 [经度, 纬度, 高度] */
  location: [number, number, number];
  /** 设置相机位置区域（至少三个坐标点，三角区域）[选填] */
  locationLimit?: number[][];
  /** 相机旋转参数 */
  rotation: {
    /** 俯仰角（垂直方向旋转角度） */
    pitch: number;
    /** 偏航角（水平方向旋转角度） */
    yaw: number;
  };
  /** 俯仰角限制范围（-90~0） */
  pitchLimit: [number, number];
  /** 偏航角限制范围（-180~180） */
  yawLimit: [number, number];
  /** 可视距离范围 [最小值, 最大值] */
  viewDistanceLimit: [number, number];
  /** 相机视锥横向视角（0-120度） */
  fieldOfView: number;
  /** 控制模式 */
  controlMode: "RTS" | "TPS" | "FPS";
  /** 场景过渡动画时长（单位：秒） */
  flyTime: number;
}

/** Camera data information interface
 * Contains camera name, description and its configuration data
 */
interface CameraDataInfo {
  /** Camera view name */
  Name: String;
  /** Description of the camera view */
  Description: String;
  /** Camera configuration data */
  CameraData: CameraData;
}

const CameraDatas: {[id:string]: CameraDataInfo} = {
    "Reception": {
        Name: "Reception",
        Description: "前台区域视角",
        CameraData: {
            location: [1.28, -23.57, 6.03],
            locationLimit: [],
            rotation: {
                pitch: -23.36,
                yaw: 47.04
            },
            pitchLimit: [-89, -3],
            yawLimit: [-180, 180],
            viewDistanceLimit: [1, 12000000],
            fieldOfView: 90,
            controlMode: "RTS",
            flyTime: 1
        }
    },
    "ConferenceRoom1": {
        Name: "ConferenceRoom1",
        Description: "会议室视角",
        CameraData: {
            location: [14.172, -22.326, 5.850],
            locationLimit: [],
            rotation: {
                pitch: -41.573,
                yaw: 22.409
            },
            pitchLimit: [-89, -3],
            yawLimit: [-180, 180],
            viewDistanceLimit: [1, 12000000],
            fieldOfView: 90,
            controlMode: "RTS",
            flyTime: 1
        }
    },
    "Inception": {
        Name: "Inception",
        Description: "接待区视角",
        CameraData: {
            location: [12.99, -20.97, 6.10],
            locationLimit: [],
            rotation: {
                pitch: -27.77,
                yaw: 88.94
            },
            pitchLimit: [-89, -3],
            yawLimit: [-180, 180],
            viewDistanceLimit: [1, 12000000],
            fieldOfView: 90,
            controlMode: "RTS",
            flyTime: 1
        }
    },
    "Restspace": {
        Name: "Restspace",
        Description: "休息区视角",
        CameraData: {
            location: [20.577, -17.613, 6.007],
            locationLimit: [],
            rotation: {
                pitch: -41.328,
                yaw: 71.930
            },
            pitchLimit: [-89, -3],
            yawLimit: [-180, 180],
            viewDistanceLimit: [1, 12000000],
            fieldOfView: 90,
            controlMode: "RTS",
            flyTime: 1
        }
    },
    "Workspace": {
        Name: "Workspace",
        Description: "工作区视角",
        CameraData: {
            location: [17.25066381524492,-10.084610787935528,5.433206962757891],
            rotation: {
                pitch: -39.981536865234375,
                yaw: -122.5937728881836
            },
            locationLimit: [],
            pitchLimit: [-89, -3],
            yawLimit: [-179.99998474121094, 179.99998474121094],
            viewDistanceLimit: [1, 12000000],
            controlMode: "RTS",
            fieldOfView: 90,
            flyTime: 1
        }
    }
}

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new Server(
  {
    name: "mcp-51world-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler for listing available notes as resources.
 * Each note is exposed as a resource with:
 * - A note:// URI scheme
 * - Plain text MIME type
 * - Human readable name and description (now including the note title)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const noteResources = Object.entries(notes).map(([id, note]) => ({
    uri: `note:///${id}`,
    mimeType: "text/plain",
    name: note.title,
    description: `A text note: ${note.title}`
  }));

  const cameraResources = Object.entries(CameraDatas).map(([id, cameraData]) => ({
    uri: `cameradata:///${id}`,
    mimeType: "application/json",
    name: `Camera: ${id}`,
    description: `Camera configuration for ${id} with ${cameraData.Description} mode`,
    metadata: {
      controlMode: cameraData.CameraData.controlMode,
      location: cameraData.CameraData.location,
      fieldOfView: cameraData.CameraData.fieldOfView,
      rotation: cameraData.CameraData.rotation,
      pitchLimit: cameraData.CameraData.pitchLimit,
      yawLimit: cameraData.CameraData.yawLimit,
    }
  }));

  return {
    resources: [...noteResources, ...cameraResources]
  };
});

/**
 * Handler for reading the contents of a specific note.
 * Takes a note:// URI and returns the note content as plain text.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  if (url.protocol === 'note:') {
    const id = url.pathname.replace(/^\//, '');
    const note = notes[id];

    if (!note) {
      throw new Error(`Note ${id} not found`);
    }

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "text/plain",
        text: note.content
      }]
    };
  } else if (url.protocol === 'cameradata:') {
    const id = url.pathname.replace(/^\//, '');
    const cameraData = CameraDatas[id];

    if (!cameraData) {
      throw new Error(`Camera ${id} not found`);
    }

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(cameraData)
      }]
    };
  }
  throw new Error(`Unsupported protocol: ${url.protocol}`);
});

/**
 * Handler that lists available tools.
 * Exposes a single "create_note" tool that lets clients create new notes.
 */
// 添加WebSocket客户端
let wsClient: WebSocket | null = null;

// 在现有notes定义后添加
const connectWebSocket = () => {
  wsClient = new WebSocket('ws://localhost:5151');
  
  wsClient.on('open', () => {
    console.log('Connected to WebSocket server');
  });
  
  wsClient.on('message', (data) => {
    console.log('Received:', data.toString());
  });
  
  wsClient.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  wsClient.on('close', () => {
    console.log('Disconnected from WebSocket server');
    // 尝试重连
    setTimeout(connectWebSocket, 5000);
  });
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_note",
        description: "Create a new note",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Title of the note" },
            content: { type: "string", description: "Text content of the note" }
          },
          required: ["title", "content"]
        }
      },
      {
        name: "get_camera_info",
        description: "Get camera information and status",
        inputSchema: {
          type: "object",
          properties: {
            guid: { type: "string", description: "Camera GUID" }
          },
          required: []
        }
      },
      {
        name: "send_message",
        description: "Send message to WebSocket server",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string", description: "Message to send" }
          },
          required: ["message"]
        }
      },
      {
        name: "update_camera",
        description: "Update camera parameters and control settings",
        inputSchema: {
          type: "object",
          properties: {
            guid: { type: "string", description: "Camera GUID" },
            location: { 
              type: "array",
              items: { type: "number" },
              minItems: 3,
              maxItems: 3,
              description: "Camera location coordinates [x, y, z]" 
            },
            rotation: {
              type: "object",
              properties: {
                pitch: { type: "number", description: "Camera pitch angle" },
                yaw: { type: "number", description: "Camera yaw angle" }
              },
              required: ["pitch", "yaw"]
            },
            locationLimit: {
              type: "array",
              items: { type: "number" },
              description: "Location limits"
            },
            pitchLimit: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
              description: "Pitch angle limits [min, max]"
            },
            yawLimit: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
              description: "Yaw angle limits [min, max]"
            },
            viewDistanceLimit: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
              description: "View distance limits [min, max]"
            },
            controlMode: { type: "string", description: "Camera control mode" },
            fieldOfView: { type: "number", description: "Camera field of view" },
            flyTime: { type: "number", description: "Camera fly time" }
          },
          required: ["location", "rotation"]
        }
      },
      {
        name: "set_camera_mode",
        description: "Set camera control mode",
        inputSchema: {
          type: "object",
          properties: {
            controlMode: { type: "string", description: "Camera control mode" }
          },
          required: ["controlMode"]
        }
      }
    ]
  };
});

/**
 * Handler for the create_note tool.
 * Creates a new note with the provided title and content, and returns success message.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "set_camera_mode": {
      const { controlMode } = request.params.arguments as { controlMode: string };
      
      if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
        connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket connection failed");
      }

      const message = {
          apiClassName: "WdpCameraControlAPI",
          apiFuncName: "SetCameraMode",
          args: {
            controlMode: controlMode
          }
      };

      // 使用Promise包装WebSocket通信,增加错误处理和超时控制
      return new Promise((resolve, reject) => {
        wsClient?.send(JSON.stringify(message), (error) => {
          if (error) {
            reject(error);
            return;
          }
          
          // 等待服务器响应
          wsClient?.once('message', (response) => {
            try {
              const result = JSON.parse(response.toString());
              resolve({
                content: [{
                  type: "text", 
                  text: `Camera mode set successfully: ${JSON.stringify(result)}`
                }]
              });
            } catch (e) {
              reject(new Error("Invalid response format"));
            }
          });
          
          // 设置5秒超时
          setTimeout(() => {
            reject(new Error("Camera mode setting timeout"));
          }, 5000);
        });
      });
    }
    case "create_note": {
      const title = String(request.params.arguments?.title);
      const content = String(request.params.arguments?.content);
      if (!title || !content) {
        throw new Error("Title and content are required");
      }

      const id = String(Object.keys(notes).length + 1);
      notes[id] = { title, content };

      return {
        content: [{
          type: "text",
          text: `Created note ${id}: ${title}`
        }]
      };
    }
    case "send_message": {
      const message = String(request.params.arguments?.message);
      if (!message) {
        throw new Error("Message is required");
      }
      
      if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }

      return new Promise((resolve, reject) => {
        wsClient?.send(message, (error) => {
          if (error) {
            reject(error);
            return;
          }
          
          // 等待服务器响应
          wsClient?.once('message', (response) => {
            resolve({
              content: [{
                type: "text",
                text: `Server response: ${response.toString()}`
              }]
            });
          });
          
          // 设置超时
          setTimeout(() => {
            reject(new Error("Server response timeout"));
          }, 5000);
        });
      });
    }

    case "update_camera": {
      const params = request.params.arguments;
      if (!params) {
        throw new Error("Camera parameters are required");
      }

      const apiParams = {
        apiClassName: "WdpCameraControlAPI",
        apiFuncName: "UpdateCamera",
        args: {
          guid: "",
          location: params.location || [0, 0, 0],
          rotation: params.rotation || { pitch: 0, yaw: 0 },
          locationLimit: params.locationLimit || [],
          pitchLimit: params.pitchLimit || [-90, 0],
          yawLimit: params.yawLimit || [-180, 180],
          viewDistanceLimit: params.viewDistanceLimit || [1, 2000],
          // controlMode: params.controlMode || "RTS",
          controlMode:"RTS",
          fieldOfView: params.fieldOfView || 60,
          flyTime: params.flyTime || 0
        }
      };

      if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }

      return new Promise((resolve, reject) => {
        wsClient?.send(JSON.stringify(apiParams), (error) => {
          if (error) {
            reject(error);
            return;
          }
          
          wsClient?.once('message', (response) => {
            try {
              const result = JSON.parse(response.toString());
              resolve({
                content: [{
                  type: "text",
                  text: JSON.stringify(result)
                }]
              });
            } catch (e) {
              reject(new Error("Invalid response format"));
            }
          });
          
          setTimeout(() => {
            reject(new Error("Camera update timeout"));
          }, 5000);
        });
      });
    }
    case "get_camera_info": {
      // const guid = String(request.params.arguments?.guid);
      // if (!guid) {
      //   throw new Error("Camera GUID is required");
      // }
      const apiParams = {
        apiClassName: "WdpCameraControlAPI",
        apiFuncName: "GetCameraInfo",
        args: {
          guid: ""
        }
      };
      if (!wsClient || wsClient.readyState!== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }
      return new Promise((resolve, reject) => {
        wsClient?.send(JSON.stringify(apiParams), (error) => {
          if (error) {
            reject(error);
            return;
          }
          wsClient?.once('message', (response) => {
            try {
              const result = JSON.parse(response.toString());
              resolve({
                content: [{
                  type: "text",
                  text: JSON.stringify(result)
                }]
              });
            } catch (e) {
              reject(new Error("Invalid response format"));
            }
          });
          setTimeout(() => {
            reject(new Error("Camera info request timeout"));
          }, 5000);
        });
      });
    }
    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Handler that lists available prompts.
 * Exposes a single "summarize_notes" prompt that summarizes all notes.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "summarize_notes",
        description: "Summarize all notes",
      },
      {
        name: "get_camera_info",
        description: "Get camera information and status"
      }
    ]
  };
});

/**
 * Handler for the summarize_notes prompt.
 * Returns a prompt that requests summarization of all notes, with the notes' contents embedded as resources.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "summarize_notes") {
    throw new Error("Unknown prompt");
  }

  const embeddedNotes = Object.entries(notes).map(([id, note]) => ({
    type: "resource" as const,
    resource: {
      uri: `note:///${id}`,
      mimeType: "text/plain",
      text: note.content
    }
  }));

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Please summarize the following notes:"
        }
      },
      ...embeddedNotes.map(note => ({
        role: "user" as const,
        content: note
      })),
      {
        role: "user",
        content: {
          type: "text",
          text: "Provide a concise summary of all the notes above."
        }
      }
    ]
  };
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  connectWebSocket();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
