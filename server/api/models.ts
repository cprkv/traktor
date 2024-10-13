// NOTE (vadik): keep this file pure from importings because it is also included from client

export interface UserInfo {
  login: string;
  canCreateRooms: boolean;
  canCreateUsers: boolean;
}

export interface CreateUserInfo extends UserInfo {
  password: string;
}

export interface AuthLoginInfo {
  login: string;
  password: string;
}

export interface RoomInfo {
  name: string;
  createdBy: string;
  createdAt: number;
  count: number;
}

export interface CreateRoomInfo {
  name: string;
}
