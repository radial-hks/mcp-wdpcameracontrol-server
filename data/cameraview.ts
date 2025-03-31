
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
        Description: " 前台区域视角，前台人员的办公区域",
        CameraData: {
            location: [7.32, -26.25, 5.86],
            locationLimit: [],
            rotation: {
                pitch: -24.63,
                yaw: 3.65
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
        Description: "会议室1视角",
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
        Description: "接待区视角，盗梦空间",
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