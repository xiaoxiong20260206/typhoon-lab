// The simulation remains inside 100°E–175°E; the wider viewport provides ocean
// and continental context without admitting storms outside the experiment domain.
export const BOUNDS=Object.freeze({west:80,east:180,south:-20,north:60});
export function pointInRing(lon,lat,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;
  }return inside;
}
export function makeLandTest(polygons){
  const indexed=polygons.map(rings=>({rings,b:[Math.min(...rings[0].map(p=>p[0])),Math.min(...rings[0].map(p=>p[1])),Math.max(...rings[0].map(p=>p[0])),Math.max(...rings[0].map(p=>p[1]))]}));
  return (lon,lat)=>indexed.some(({rings,b})=>lon>=b[0]&&lon<=b[2]&&lat>=b[1]&&lat<=b[3]&&pointInRing(lon,lat,rings[0])&&!rings.slice(1).some(r=>pointInRing(lon,lat,r)));
}
export const PLACES=[
  // name, longitude, latitude, visual tier (0 = major, 1 = secondary)
  ['北京',116.4,39.9,0],['上海',121.47,31.23,0],['台北',121.56,25.03,0],['香港',114.17,22.32,0],
  ['东京',139.69,35.68,0],['首尔',126.98,37.57,0],['马尼拉',120.98,14.6,0],['河内',105.85,21.03,0],
  ['海口',110.2,20.04,1],['广州',113.26,23.13,1],['深圳',114.06,22.54,1],['澳门',113.54,22.19,1],
  ['天津',117.2,39.08,1],['沈阳',123.43,41.8,1],['青岛',120.38,36.07,1],['南京',118.8,32.06,1],
  ['杭州',120.16,30.27,1],['福州',119.3,26.08,1],['厦门',118.09,24.48,1],['武汉',114.31,30.59,1],
  ['长沙',112.94,28.23,1],['郑州',113.63,34.75,1],['西安',108.94,34.34,1],['重庆',106.55,29.56,1],
  ['成都',104.07,30.67,1],['昆明',102.83,24.88,1],['南宁',108.37,22.82,1],['兰州',103.83,36.06,1],
  ['大阪',135.5,34.69,1],['福冈',130.4,33.59,1],['釜山',129.08,35.18,1],['平壤',125.76,39.04,1],
  ['那霸',127.68,26.21,1],['岘港',108.22,16.05,1],['胡志明',106.63,10.82,1],['曼谷',100.5,13.75,1],
  ['吉隆坡',101.69,3.14,1],['新加坡',103.82,1.35,1],['雅加达',106.85,-6.21,1],['达尔文',130.84,-12.46,1],
  ['凯恩斯',145.77,-16.92,1],['莫尔兹比港',147.18,-9.44,1],['关岛',144.79,13.44,1],['塞班',145.75,15.18,1],
  ['帕劳',134.58,7.51,1],['马朱罗',171.38,7.12,1]
];
