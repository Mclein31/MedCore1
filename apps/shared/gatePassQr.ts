import QRCode from 'qrcode';

// Both clients use the same encoder, error correction, mask selection and quiet zone.
export function gatePassMatrix(payload:string) {
  const matrix=QRCode.create(payload,{errorCorrectionLevel:'M'}).modules;
  let path='';
  for(let y=0;y<matrix.size;y++)for(let x=0;x<matrix.size;x++)if(matrix.get(y,x))path+=`M${x+4} ${y+4}h1v1h-1z`;
  return {path,size:matrix.size+8};
}
export function gatePassQrSize(modules:number,available=268) {
  const width=Number.isFinite(available)&&available>0?available:268;
  return Math.max(1,Math.floor(Math.min(270,width)/modules))*modules;
}
