// TODO: 可删除该文件
export interface SongUrl {
  url: string;
  br: number;
  size: number;
}

export interface SongPic {
  url: string;
}

export interface SongLyric {
  lyric: string;
  tlyric?: string;
}

export const sourceLabels: Record<string, string> = {
  kuwo: "酷我",
  netease: "网易",
  _netease: "网易",
  joox: "Joox",
};

export const sourceBadgeStyles: Record<string, string> = {
  netease: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
  // _netease: "bg-red-100 text-red-1200 border-red-400 hover:bg-red-200",
  kuwo: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100",
  joox: "bg-green-50 text-green-600 border-green-200 hover:bg-green-100",
  default: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
};
