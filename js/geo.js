export const BOUNDS=Object.freeze({west:100,east:175,south:0,north:55});
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
  ['北京',116.4,39.9],['上海',121.5,31.2],['台北',121.56,25.03],['香港',114.17,22.3],
  ['海口',110.3,20.0],['福州',119.3,26.1],['马尼拉',120.98,14.6],['东京',139.69,35.68],
  ['首尔',126.98,37.57],['大阪',135.5,34.7],['那霸',127.7,26.2],['河内',105.85,21.0],['关岛',144.8,13.45]
];
