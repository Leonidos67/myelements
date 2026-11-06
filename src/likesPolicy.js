export const LIKES_PER_1000={min:30,ideal:40,max:50};
export function likesTarget(views,likes=0){
 const count=Number(views);if(!Number.isFinite(count)||count<=0)return null;
 const actual=Math.max(0,Number(likes)||0),ratio=count/1000;
 const min=Math.round(LIKES_PER_1000.min*ratio),ideal=Math.round(LIKES_PER_1000.ideal*ratio),max=Math.round(LIKES_PER_1000.max*ratio);
 return{min,ideal,max,status:actual<min?'low':actual>max?'high':'ideal',needed:Math.max(0,min-actual),above:Math.max(0,actual-max)};
}
