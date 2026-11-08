// Chinese labels for familiar names; the canonical full English list comes from JMA.
export const CHINESE_NAMES=Object.freeze({
  Damrey:'达维',Tianma:'天马',Kirogi:'鸿雁','Yun-yeung':'鸳鸯',Koinu:'小犬',Bolaven:'布拉万',Sanba:'三巴',Jelawat:'杰拉华',
  Maliksi:'马力斯',Gaemi:'格美',Prapiroon:'派比安',Maria:'玛莉亚','Son-Tinh':'山神',Ampil:'安比',Wukong:'悟空',
  Jongdari:'云雀',Shanshan:'珊珊',Leepi:'丽琵',Bebinca:'贝碧嘉',Pulasan:'普拉桑',Soulik:'苏力',Cimaron:'西马仑',
  Yinxing:'银杏',Pabuk:'帕布',Wutip:'蝴蝶',Sepat:'圣帕',Mun:'木恩',Danas:'丹娜丝',Nari:'百合',Wipha:'韦帕',Francisco:'范斯高',
  Krosa:'罗莎',Bailu:'白鹿',Podul:'杨柳',Lingling:'玲玲',Kajiki:'剑鱼',Peipah:'琵琶',Tapah:'塔巴',Mitag:'米娜',Ragasa:'桦加沙',
  Neoguri:'浣熊',Bualoi:'博罗依',Matmo:'麦德姆',Halong:'夏浪',Nakri:'娜基莉',Fengshen:'风神',Kalmaegi:'海鸥','Fung-wong':'凤凰',
  Nuri:'鹦鹉',Sinlaku:'森拉克',Hagupit:'黑格比',Jangmi:'蔷薇',Mekkhala:'米克拉',Higos:'海高斯',Bavi:'巴威',Maysak:'美莎克',
  Haishen:'海神',Noul:'红霞',Dolphin:'白海豚',Kujira:'鲸鱼','Chan-hom':'灿鸿',Nangka:'浪卡',Saudel:'沙德尔',Atsani:'艾莎尼',
  Etau:'艾涛',Krovanh:'科罗旺',Dujuan:'杜鹃',Surigae:'舒力基','Choi-wan':'彩云',Koguma:'小熊',Champi:'蔷琵','In-fa':'烟花',
  Cempaka:'查帕卡',Nepartak:'尼伯特',Lupit:'卢碧',Mirinae:'银河',Nida:'妮妲',Omais:'奥麦斯',Chanthu:'灿都',Dianmu:'电母',
  Mindulle:'蒲公英',Lionrock:'狮子山',Namtheun:'南川',Malou:'玛瑙',Nyatoh:'妮亚图',Chaba:'暹芭',Aere:'艾利',Songda:'桑达',
  Trases:'翠丝',Mulan:'木兰',Meari:'米雷',Tokage:'蝎虎','Ong-mang':'蚂鞍',Muifa:'梅花',Merbok:'苗柏',Nanmadol:'南玛都',
  Talas:'塔拉斯',Kulap:'玫瑰',Roke:'洛克',Sonca:'桑卡',Nesat:'纳沙',Haitang:'海棠',Banyan:'榕树',Yamaneko:'山猫',Pakhar:'帕卡',
  Sanvu:'珊瑚',Mawar:'玛娃',Guchol:'古超',Talim:'泰利',Khanun:'卡努',Lan:'兰恩'
});
// Defaults allow model tests without browser fetch; app replaces this with all 140 names.
export const DEFAULT_NAMES=Object.freeze(['Damrey','Tianma','Kirogi','Yun-yeung','Koinu','Bolaven'].map(en=>Object.freeze({en,cn:CHINESE_NAMES[en]})));
export function localizeNames(data){return Object.freeze(data.names.map(n=>Object.freeze({...n,cn:CHINESE_NAMES[n.en]||n.en})));}
