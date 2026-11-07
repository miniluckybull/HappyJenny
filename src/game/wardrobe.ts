/**
 * wardrobe.ts — avatar configuration schema, item catalog, presets and validation.
 * All ids are original designs (daily / academy / stellar / ancient / ocean /
 * bakery / dino / sport / magic themes); no copyrighted characters.
 */

/** Every configurable slot of an avatar. All values are item id strings. */
export interface AvatarConfig {
  base: string;
  skin: string;
  hair: string;
  hairColor: string;
  eyes: string;
  mouth: string;
  top: string;
  bottom: string;
  shoes: string;
  hat: string;
  accessory: string;
}

export interface WardrobeItem {
  /** Stable id used inside AvatarConfig. */
  id: string;
  /** Chinese display name. */
  name: string;
  /** Emoji icon for UI pickers. */
  icon: string;
  /** Representative display color (optional). */
  color?: string;
  /** Theme tag (optional). */
  theme?: string;
}

/** Slot ordering used by pickers / validation. */
export const CATEGORY_ORDER: (keyof AvatarConfig)[] = [
  "base",
  "skin",
  "hair",
  "hairColor",
  "eyes",
  "mouth",
  "top",
  "bottom",
  "shoes",
  "hat",
  "accessory",
];

export const WARDROBE: Record<keyof AvatarConfig, WardrobeItem[]> = {
  base: [
    { id: "base_girl", name: "少女体型", icon: "👧", theme: "daily" },
    { id: "base_boy", name: "少年体型", icon: "👦", theme: "daily" },
    { id: "base_neutral", name: "中性体型", icon: "🧑", theme: "daily" },
  ],
  skin: [
    { id: "skin_porcelain", name: "瓷白", icon: "🤍", color: "#ffe8dd" },
    { id: "skin_ivory", name: "象牙", icon: "🌼", color: "#ffdcc4" },
    { id: "skin_peach", name: "蜜桃", icon: "🍑", color: "#f7c6a3" },
    { id: "skin_wheat", name: "小麦", icon: "🌾", color: "#e3a97c" },
    { id: "skin_honey", name: "蜜糖", icon: "🍯", color: "#c98a5c" },
    { id: "skin_cocoa", name: "可可", icon: "🍫", color: "#8a5a3b" },
  ],
  hair: [
    { id: "hair_bob", name: "波波头", icon: "💇", theme: "daily" },
    { id: "hair_twintail", name: "双马尾", icon: "🎀", theme: "daily" },
    { id: "hair_short", name: "清爽短发", icon: "✂️", theme: "academy" },
    { id: "hair_ponytail", name: "高马尾", icon: "🏃", theme: "sport" },
    { id: "hair_long", name: "及腰长发", icon: "🌙", theme: "ancient" },
    { id: "hair_hime", name: "公主切", icon: "👸", theme: "ancient" },
    { id: "hair_buns", name: "双丸子头", icon: "🍡", theme: "bakery" },
    { id: "hair_curly", name: "蓬蓬卷发", icon: "🧁", theme: "bakery" },
    { id: "hair_sidebraid", name: "侧麻花辫", icon: "🐚", theme: "ocean" },
    { id: "hair_messy", name: "星云碎发", icon: "🌌", theme: "stellar" },
    { id: "hair_spiky", name: "冲天刺发", icon: "🦖", theme: "dino" },
    { id: "hair_afro", name: "云朵爆炸头", icon: "🔮", theme: "magic" },
  ],
  hairColor: [
    { id: "hc_black", name: "乌黑", icon: "⚫", color: "#2b2b33" },
    { id: "hc_chestnut", name: "栗棕", icon: "🌰", color: "#6b4226" },
    { id: "hc_honey", name: "蜂蜜金", icon: "🍯", color: "#e2a94e" },
    { id: "hc_cherry", name: "樱桃红", icon: "🍒", color: "#c94f4f" },
    { id: "hc_orange", name: "蜜橘", icon: "🍊", color: "#e8803a" },
    { id: "hc_mint", name: "薄荷绿", icon: "🌿", color: "#6fbf8f" },
    { id: "hc_sky", name: "天空蓝", icon: "💧", color: "#5aa7e8" },
    { id: "hc_lavender", name: "薰衣草紫", icon: "🪻", color: "#9b82d9" },
    { id: "hc_sakura", name: "樱花粉", icon: "🌸", color: "#f0a6c0" },
    { id: "hc_silver", name: "奶白银", icon: "🥛", color: "#e8e4da" },
  ],
  eyes: [
    { id: "eyes_round", name: "圆圆眼", icon: "👀" },
    { id: "eyes_smile", name: "眯眯笑眼", icon: "😊" },
    { id: "eyes_star", name: "星星眼", icon: "🤩", theme: "stellar" },
    { id: "eyes_sleepy", name: "困倦眼", icon: "🥱" },
    { id: "eyes_sharp", name: "英气眼", icon: "⚡", theme: "sport" },
    { id: "eyes_wink", name: "眨眨眼", icon: "😉", theme: "daily" },
    { id: "eyes_heart", name: "爱心眼", icon: "😍", theme: "bakery" },
    { id: "eyes_cat", name: "猫眼", icon: "🐱", theme: "magic" },
  ],
  mouth: [
    { id: "mouth_smile", name: "微笑", icon: "🙂" },
    { id: "mouth_grin", name: "露齿笑", icon: "😁" },
    { id: "mouth_o", name: "惊讶", icon: "😮" },
    { id: "mouth_cat", name: "猫咪嘴", icon: "😺" },
    { id: "mouth_flat", name: "淡定", icon: "😐" },
    { id: "mouth_open", name: "开心大笑", icon: "😄" },
  ],
  top: [
    { id: "top_tee", name: "云朵棉T恤", icon: "👕", color: "#7ec8f2", theme: "daily" },
    { id: "top_hoodie", name: "连帽卫衣", icon: "🧥", color: "#f2a0b5", theme: "daily" },
    { id: "top_uniform", name: "学院制服", icon: "🎓", color: "#3b4a6b", theme: "academy" },
    { id: "top_sweater", name: "针织毛衣", icon: "🧶", color: "#e8c46a", theme: "academy" },
    { id: "top_spacesuit", name: "星际飞行服", icon: "🚀", color: "#d9dde8", theme: "stellar" },
    { id: "top_starjacket", name: "星轨夹克", icon: "🌠", color: "#41407a", theme: "stellar" },
    { id: "top_hanfu", name: "交领襦衣", icon: "🏮", color: "#e88f9f", theme: "ancient" },
    { id: "top_daorobe", name: "云纹道袍", icon: "☁️", color: "#9fc3e8", theme: "ancient" },
    { id: "top_sailor", name: "海风水手服", icon: "⚓", color: "#ffffff", theme: "ocean" },
    { id: "top_apron", name: "烘焙围裙", icon: "🥐", color: "#f5e6c8", theme: "bakery" },
    { id: "top_dinohoodie", name: "恐龙卫衣", icon: "🦕", color: "#7fbf6a", theme: "dino" },
    { id: "top_jersey", name: "运动背心", icon: "🏀", color: "#f2703f", theme: "sport" },
  ],
  bottom: [
    { id: "bottom_jeans", name: "直筒牛仔裤", icon: "👖", color: "#5a7fb8", theme: "daily" },
    { id: "bottom_shorts", name: "休闲短裤", icon: "🩳", color: "#d9b36a", theme: "daily" },
    { id: "bottom_pleated", name: "百褶裙", icon: "🎀", color: "#8a5f9e", theme: "academy" },
    { id: "bottom_trousers", name: "学院西裤", icon: "📚", color: "#4a4a55", theme: "academy" },
    { id: "bottom_spacepants", name: "星际工装裤", icon: "🛰️", color: "#aab2c5", theme: "stellar" },
    { id: "bottom_longskirt", name: "古风长裙", icon: "🌸", color: "#e88f9f", theme: "ancient" },
    { id: "bottom_beach", name: "浪花沙滩裤", icon: "🌊", color: "#3fa8c9", theme: "ocean" },
    { id: "bottom_bloomers", name: "烘焙灯笼裤", icon: "🧁", color: "#f0c987", theme: "bakery" },
    { id: "bottom_dinopants", name: "恐龙尾巴裤", icon: "🦖", color: "#6faf5c", theme: "dino" },
    { id: "bottom_sportshorts", name: "运动短裤", icon: "🏅", color: "#e84f4f", theme: "sport" },
  ],
  shoes: [
    { id: "shoes_sneakers", name: "帆布鞋", icon: "👟", color: "#ffffff", theme: "daily" },
    { id: "shoes_loafers", name: "学院皮鞋", icon: "🥿", color: "#5a3a28", theme: "academy" },
    { id: "shoes_spaceboots", name: "星际靴", icon: "🚀", color: "#c5cbdb", theme: "stellar" },
    { id: "shoes_cloth", name: "云履布鞋", icon: "🏮", color: "#3f3f4a", theme: "ancient" },
    { id: "shoes_sandals", name: "贝壳凉鞋", icon: "🐚", color: "#f2d8a8", theme: "ocean" },
    { id: "shoes_slippers", name: "面包拖鞋", icon: "🍞", color: "#e0aa6e", theme: "bakery" },
    { id: "shoes_dinofeet", name: "恐龙爪鞋", icon: "🦖", color: "#6faf5c", theme: "dino" },
    { id: "shoes_runners", name: "疾风跑鞋", icon: "💨", color: "#ff8a5c", theme: "sport" },
  ],
  hat: [
    { id: "hat_none", name: "不戴帽子", icon: "🚫" },
    { id: "hat_cap", name: "棒球帽", icon: "🧢", color: "#e85c5c", theme: "daily" },
    { id: "hat_beret", name: "学院贝雷帽", icon: "🎓", color: "#7a4a8a", theme: "academy" },
    { id: "hat_helmet", name: "星空头盔", icon: "🪐", color: "#bcd6f2", theme: "stellar" },
    { id: "hat_hairpin", name: "古风发簪", icon: "🌸", color: "#e8a0b5", theme: "ancient" },
    { id: "hat_straw", name: "海洋草帽", icon: "👒", color: "#e8cf8a", theme: "ocean" },
    { id: "hat_chef", name: "烘焙厨师帽", icon: "👨‍🍳", color: "#ffffff", theme: "bakery" },
    { id: "hat_dino", name: "恐龙头套", icon: "🦖", color: "#7fbf6a", theme: "dino" },
    { id: "hat_headband", name: "运动发带", icon: "🎽", color: "#f2f25c", theme: "sport" },
    { id: "hat_wizard", name: "魔法尖帽", icon: "🪄", color: "#5a4a9e", theme: "magic" },
  ],
  accessory: [
    { id: "acc_none", name: "无配饰", icon: "🚫" },
    { id: "acc_bag", name: "帆布小包", icon: "👜", color: "#c9a06a", theme: "daily" },
    { id: "acc_glasses", name: "圆框眼镜", icon: "👓", color: "#4a4a55", theme: "academy" },
    { id: "acc_jetpack", name: "星际喷气包", icon: "🚀", color: "#8a92a8", theme: "stellar" },
    { id: "acc_flute", name: "古风玉笛", icon: "🎋", color: "#a8d8b0", theme: "ancient" },
    { id: "acc_float", name: "海洋泳圈", icon: "🛟", color: "#ff8a8a", theme: "ocean" },
    { id: "acc_whisk", name: "烘焙打蛋器", icon: "🥄", color: "#c5c9d2", theme: "bakery" },
    { id: "acc_dinotail", name: "恐龙尾巴", icon: "🦕", color: "#6faf5c", theme: "dino" },
    { id: "acc_basketball", name: "运动篮球", icon: "🏀", color: "#e8783f", theme: "sport" },
    { id: "acc_wand", name: "魔法手杖", icon: "✨", color: "#8a6ad8", theme: "magic" },
  ],
};

export const DEFAULT_AVATAR: AvatarConfig = {
  base: "base_girl",
  skin: "skin_porcelain",
  hair: "hair_twintail",
  hairColor: "hc_chestnut",
  eyes: "eyes_round",
  mouth: "mouth_smile",
  top: "top_tee",
  bottom: "bottom_pleated",
  shoes: "shoes_sneakers",
  hat: "hat_none",
  accessory: "acc_none",
};

/** Ready-made full outfits; every entry is a complete valid AvatarConfig. */
export const PRESETS: AvatarConfig[] = [
  {
    // 元气日常
    base: "base_girl",
    skin: "skin_ivory",
    hair: "hair_twintail",
    hairColor: "hc_chestnut",
    eyes: "eyes_round",
    mouth: "mouth_smile",
    top: "top_hoodie",
    bottom: "bottom_jeans",
    shoes: "shoes_sneakers",
    hat: "hat_cap",
    accessory: "acc_bag",
  },
  {
    // 星际漫游
    base: "base_boy",
    skin: "skin_peach",
    hair: "hair_messy",
    hairColor: "hc_sky",
    eyes: "eyes_star",
    mouth: "mouth_open",
    top: "top_spacesuit",
    bottom: "bottom_spacepants",
    shoes: "shoes_spaceboots",
    hat: "hat_helmet",
    accessory: "acc_jetpack",
  },
  {
    // 海棠国风
    base: "base_girl",
    skin: "skin_porcelain",
    hair: "hair_long",
    hairColor: "hc_black",
    eyes: "eyes_sleepy",
    mouth: "mouth_smile",
    top: "top_hanfu",
    bottom: "bottom_longskirt",
    shoes: "shoes_cloth",
    hat: "hat_hairpin",
    accessory: "acc_flute",
  },
  {
    // 魔法假日
    base: "base_neutral",
    skin: "skin_porcelain",
    hair: "hair_afro",
    hairColor: "hc_lavender",
    eyes: "eyes_cat",
    mouth: "mouth_cat",
    top: "top_sweater",
    bottom: "bottom_pleated",
    shoes: "shoes_loafers",
    hat: "hat_wizard",
    accessory: "acc_wand",
  },
  {
    // 海洋假日
    base: "base_boy",
    skin: "skin_wheat",
    hair: "hair_sidebraid",
    hairColor: "hc_honey",
    eyes: "eyes_wink",
    mouth: "mouth_grin",
    top: "top_sailor",
    bottom: "bottom_beach",
    shoes: "shoes_sandals",
    hat: "hat_straw",
    accessory: "acc_float",
  },
  {
    // 烘焙学徒
    base: "base_neutral",
    skin: "skin_peach",
    hair: "hair_buns",
    hairColor: "hc_sakura",
    eyes: "eyes_heart",
    mouth: "mouth_cat",
    top: "top_apron",
    bottom: "bottom_bloomers",
    shoes: "shoes_slippers",
    hat: "hat_chef",
    accessory: "acc_whisk",
  },
];

/** Defensive validation: every slot must be a known item id. */
export function isValidAvatar(config: unknown): config is AvatarConfig {
  if (typeof config !== "object" || config === null) return false;
  const record = config as Record<string, unknown>;
  for (const key of CATEGORY_ORDER) {
    const value = record[key];
    if (typeof value !== "string") return false;
    if (!WARDROBE[key].some((item) => item.id === value)) return false;
  }
  return true;
}
