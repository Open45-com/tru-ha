const boards = [
  {name:'The first crossing', size:5, start:[-1,3], target:[4,1], mirrors:[[1,3,1],[1,1,1],[3,2,0]]},
  {name:'Around the shoals', size:6, start:[-1,4], target:[5,3], mirrors:[[1,4,1],[1,1,1],[3,1,0],[3,3,0],[4,4,1]]}
];
// Orientation 0 is a forward slash, orientation 1 is a backslash.
function trace(board, faces) {
  let [x,y] = board.start, dx=1, dy=0;
  const path=[[x,y]], visited=new Set();
  for (;;) {
    x+=dx; y+=dy; path.push([x,y]);
    if(x===board.target[0] && y===board.target[1]) return {path,solved:true};
    if(x<0 || y<0 || x>=board.size || y>=board.size) break;
    const key=[x,y,dx,dy].join(',');
    if(visited.has(key)) break;
    visited.add(key);
    const i=board.mirrors.findIndex(([mx,my])=>mx===x && my===y);
    if(i>=0) [dx,dy]=faces[i]?[dy,dx]:[-dy,-dx];
  }
  return {path,solved:false};
}
module.exports={boards,trace};
