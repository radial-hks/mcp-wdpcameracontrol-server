#!/usr/bin/env node

/**
 * This is an MCP server that implements a camera control system using FastMCP framework.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing camera views as resources
 * - Reading individual camera configurations
 * - Controlling camera via various tools
 * - WebSocket communication with a 3D visualization engine
 */

import { FastMCP, UserError } from "fastmcp";
import { z } from "zod";
import WebSocket from 'ws';

// 添加WebSocket客户端
let wsClient: WebSocket | null = null;
// websocket 连接
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

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new FastMCP({
  name: "mcp-51world-server",
  version: "0.1.0",
  instructions: "This server provides tools to control a 3D camera in a virtual environment. You can list available camera views, get camera information, and control camera movements."
});

// 添加工具 - 获取相机信息
server.addTool({
  name: "get_camera_info",
  description: "Get camera information and status",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket is not connected");
    }

    const apiParams = {
      apiClassName: "WdpCameraControlAPI",
      apiFuncName: "GetCameraInfo",
      args: {
        guid: args.guid || ""
      }
    };

    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(apiParams), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Camera info request timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 发送消息
server.addTool({
  name: "send_message",
  description: "Send message to WebSocket server",
  parameters: z.object({
    message: z.string().describe("Message to send")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket is not connected");
    }

    return new Promise((resolve, reject) => {
      wsClient?.send(args.message, (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          resolve(`Server response: ${response.toString()}`);
        });

        setTimeout(() => {
          reject(new UserError("Server response timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 停止相机
server.addTool({
  name: "camera_stop",
  description: "Stop camera movement",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID (optional, defaults to empty string)")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket connection failed");
    }

    const message = {
      apiClassName: "WdpCameraControlAPI",
      apiFuncName: "CameraStop",
      args: {
        guid: args.guid || ""
      }
    };

    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Camera stop operation timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 更新相机
server.addTool({
  name: "update_camera",
  description: "Update camera parameters and control settings",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID (optional, defaults to empty string)"),
    location: z.tuple([z.number(), z.number(), z.number()])
      .describe("Camera location coordinates [x, y, z]"),
    rotation: z.object({
      pitch: z.number().describe("Camera pitch angle"),
      yaw: z.number().describe("Camera yaw angle")
    }),
    locationLimit: z.array(z.number()).optional().describe("Location limits"),
    pitchLimit: z.tuple([z.number(), z.number()]).optional().describe("Pitch angle limits [min, max]"),
    yawLimit: z.tuple([z.number(), z.number()]).optional().describe("Yaw angle limits [min, max]"),
    viewDistanceLimit: z.tuple([z.number(), z.number()]).optional().describe("View distance limits [min, max]"),
    controlMode: z.string().optional().describe("Camera control mode"),
    fieldOfView: z.number().optional().describe("Camera field of view"),
    flyTime: z.number().optional().describe("Camera fly time")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket is not connected");
    }

    const apiParams = {
      apiClassName: "WdpCameraControlAPI",
      apiFuncName: "UpdateCamera",
      args: {
        guid: args.guid || "",
        location: args.location,
        rotation: args.rotation,
        locationLimit: args.locationLimit || [],
        pitchLimit: args.pitchLimit || [-90, 0],
        yawLimit: args.yawLimit || [-180, 180],
        viewDistanceLimit: args.viewDistanceLimit || [1, 2000],
        controlMode: args.controlMode || "RTS",
        fieldOfView: args.fieldOfView || 60,
        flyTime: args.flyTime || 0
      }
    };

    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(apiParams), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Camera update timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 相机环绕
server.addTool({
  name: "camera_around",
  description: "Control camera movement in a circular motion",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID (optional, defaults to empty string)"),
    direction: z.enum(["clockwise", "anticlockwise"]).describe("Movement direction (clockwise or anticlockwise)"),
    velocity: z.number().describe("Movement speed in meters per second")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket connection failed");
    }

    const message = {
      apiClassName: "WdpCameraControlAPI",
      apiFuncName: "CameraAround",
      args: {
        guid: args.guid || "",
        direction: args.direction,
        velocity: args.velocity
      }
    };

    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Camera around operation timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 相机旋转
server.addTool({
  name: "camera_rotate",
  description: "Control camera rotation movement",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID (optional, defaults to empty string)"),
    direction: z.enum(["forward", "backward", "left", "right", "up", "down"]).describe("Movement direction"),
    velocity: z.number().describe("Movement speed in meters per second")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket connection failed");
    }

    const message = {
      apiClassName: "WdpCameraControlAPI",
      apiFuncName: "CameraRotate",
      args: {
        guid: args.guid || "",
        direction: args.direction,
        velocity: args.velocity
      }
    };

    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Camera rotate operation timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 相机移动
server.addTool({
  name: "camera_move",
  description: "Control camera movement in different directions",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID (optional, defaults to empty string)"),
    direction: z.enum(["forward", "backward", "left", "right", "up", "down"]).describe("Movement direction"),
    velocity: z.number().describe("Movement speed in meters per second")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket connection failed");
    }

    const message = {
      apiClassName: "WdpCameraControlAPI",
      apiFuncName: "CameraMove", // 修正为正确的API函数名
      args: {
        guid: args.guid || "",
        direction: args.direction,
        velocity: args.velocity
      }
    };

    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Camera move operation timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 设置相机模式
server.addTool({
  name: "set_camera_mode",
  description: "Set camera control mode",
  parameters: z.object({
    controlMode: z.string().describe("Camera control mode,RTS (飞行模式),FPS (第一人称模式),TPS (第三人称模式)")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket connection failed");
    }

    const message = {
      apiClassName: "WdpCameraControlAPI",
      apiFuncName: "SetCameraMode",
      args: {
        controlMode: args.controlMode
      }
    };

    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(`Camera mode set successfully: ${JSON.stringify(result)}`);
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Camera mode setting timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 聚焦到位置
server.addTool({
  name: "focus_to_position",
  description: "Focus camera to a specific position",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID (optional, defaults to empty string)"),
    targetPosition: z.tuple([z.number(), z.number(), z.number()])
      .describe("Target position coordinates [x, y, z]"),
    rotation: z.object({
      pitch: z.number().default(-30).describe("Camera pitch angle"),
      yaw: z.number().default(0).describe("Camera yaw angle")
    }).optional(),
    distance: z.number().default(10).optional().describe("Distance from target position"),
    flyTime: z.number().default(1).optional().describe("Camera fly time in seconds")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket connection failed");
    }

    const message = {
      apiClassName: "WdpCameraControlAPI",
      apiFuncName: "FocusToPosition",
      args: {
        guid: args.guid || "",
        targetPosition: args.targetPosition,
        rotation: args.rotation || { pitch: -30, yaw: 0 },
        distance: args.distance || 10,
        flyTime: args.flyTime || 1
      }
    };

    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Focus to position operation timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 自定义相机旋转 (EC_CameraRotate)
server.addTool({
  name: "custom_camera_rotate",
  description: "Rotate camera with custom animation parameters using EC_CameraRotate.",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID (optional, defaults to empty string)"),
    duration: z.number().default(0.5).describe("Animation transition time in seconds."),
    addPitch: z.number().default(0.0).describe("Pitch angle increment in degrees."),
    addYaw: z.number().default(0.0).describe("Yaw angle increment in degrees.")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket connection failed");
    }

    const message = {
      apiClassName: "CustomApi",
      apiFuncName: "EC_CameraRotate",
      args: {
        guid: args.guid || "", // Assuming guid might be needed, though not in user's example args
        Duration: args.duration,
        AddPitch: args.addPitch,
        AddYaw: args.addYaw
      }
    };
    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });

        setTimeout(() => {
          reject(new UserError("Camera mode setting timeout"));
        }, 5000);
      });
    });
  }
});

// 添加工具 - 自定义相机移动 (EC_CameraMove)
server.addTool({
  name: "custom_camera_move",
  description: "Move camera with custom animation parameters using EC_CameraMove.",
  parameters: z.object({
    guid: z.string().optional().describe("Camera GUID (optional, defaults to empty string)"),
    moveDirection: z.enum(["E_Forward", "E_Backward", "E_Left", "E_Right", "E_Up", "E_Down"]).describe("Movement direction"),
    moveDistance: z.number().default(5.0).describe("Movement distance in meters."),
    duration: z.number().default(0.8).describe("Movement time in seconds.")
  }),
  execute: async (args) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      throw new UserError("WebSocket connection failed");
    }
    const message = {
      apiClassName: "CustomApi",
      apiFuncName: "EC_CameraRotate",
      args: {
        guid: args.guid || "",
        MoveDirection: args.moveDirection,
        MoveDistance: args.moveDistance,
        Duration: args.duration
      }
    };
    return new Promise((resolve, reject) => {
      wsClient?.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
          return;
        }

        wsClient?.once('message', (response) => {
          try {
            const result = JSON.parse(response.toString());
            resolve(JSON.stringify(result));
          } catch (e) {
            reject(new UserError("Invalid response format"));
          }
        });
        setTimeout(() => {
          reject(new UserError("Camera mode setting timeout"));
        }, 5000);
      });
    });
  }
});


/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  connectWebSocket();
  await server.start({
    transportType: "stdio",
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});