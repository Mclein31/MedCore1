import {gatePassMatrix,gatePassQrSize} from '../lib/gatePassQr';
import {useMemo,useState} from 'react';
import {Text, View} from 'react-native';
import Svg,{Path,Rect} from 'react-native-svg';
import {Card,Row,StatusBadge,T} from './ui';
import type {PatientEncounter} from '../types/domain';
import {formatDateTime} from '../lib/format';

export default function GatePassCard({pass,offline=false}:{pass:NonNullable<PatientEncounter['dischargePass']>;offline?:boolean}) {
  const [available,setAvailable]=useState(268);
  const active=pass.status==='ACTIVE_READY_FOR_EXIT';
  const matrix=useMemo(()=>{try{return active&&pass.qrPayload?gatePassMatrix(pass.qrPayload):null;}catch{return null;}},[active,pass.qrPayload]);
  return <Card>
    <StatusBadge tone={active?'ok':'info'} text={active?'Ready for lobby verification':pass.status==='VERIFIED_AT_LOBBY'?'Exit already verified':'Pass no longer active'}/>
    {offline&&<Text style={[T.meta,{marginVertical:12}]}>Saved offline copy. Lobby staff must verify its current status before exit.</Text>}
    {matrix&&<View onLayout={event=>setAvailable(event.nativeEvent.layout.width-26)} style={{alignItems:'center',alignSelf:'center',marginVertical:16,width:'100%',maxWidth:294,padding:12,borderRadius:16,borderWidth:1,borderColor:'#e2e8f0',backgroundColor:'#fff'}}><Svg width={gatePassQrSize(matrix.size,available)} height={gatePassQrSize(matrix.size,available)} viewBox={`0 0 ${matrix.size} ${matrix.size}`} accessibilityRole="image" accessibilityLabel="Hospital-signed discharge gate pass QR"><Rect width={matrix.size} height={matrix.size} fill="#fff"/><Path d={matrix.path} fill="#000"/></Svg></View>}
    <Row label="Pass number" value={pass.passNumber}/>
    {active&&pass.exitPin&&<View style={{paddingVertical:16}}><Text style={T.meta}>Exit PIN</Text><Text selectable style={[T.display,{marginTop:6,letterSpacing:4}]}>{pass.exitPin}</Text></View>}
    <Text style={[T.body,{marginTop:8}]}>{active?'Show the QR and private PIN to lobby staff. The hospital verifies this pass online.':'This pass cannot be used for exit. Contact hospital billing if you need a current pass.'}</Text>
    <Row label="Issued" value={formatDateTime(pass.issuedAt)}/>
  </Card>;
}
