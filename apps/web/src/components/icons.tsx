/**
 * Icons for the staff dashboard. Solar (the v1 icon set, shared with the patient app through
 * @medcore/icons) wherever a Solar glyph exists; every other name falls through to lucide-react.
 * Named exports below take precedence over the star re-export.
 */
import { solarData, solarNames, type SolarWeight } from '@medcore/icons';
import type { SVGProps } from 'react';

export * from 'lucide-react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  weight?: SolarWeight;
  strokeWidth?: number | string;
}

function solar(name: string) {
  const slug = solarNames[name];
  function Icon({ size = 24, weight = 'Linear', strokeWidth = 1.5, ...props }: IconProps) {
    const nodes = solarData[`${weight}:${slug}`] ?? solarData[`Linear:${slug}`] ?? [];
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        {nodes.map((node, i) => {
          const attrs = { ...node.attrs, ...(node.attrs.stroke ? { strokeWidth } : {}) };
          if (node.tag === 'circle') return <circle key={i} {...attrs} />;
          if (node.tag === 'ellipse') return <ellipse key={i} {...attrs} />;
          return <path key={i} {...attrs} />;
        })}
      </svg>
    );
  }
  Icon.displayName = `Solar${name}`;
  return Icon;
}

export const Activity = solar('Activity');
export const AlertCircle = solar('AlertCircle');
export const AlertTriangle = solar('AlertTriangle');
export const ArrowDownRight = solar('ArrowDownRight');
export const ArrowLeft = solar('ArrowLeft');
export const ArrowRight = solar('ArrowRight');
export const ArrowUpRight = solar('ArrowUpRight');
export const BarChart3 = solar('BarChart3');
export const Bed = solar('Bed');
export const BedDouble = solar('BedDouble');
export const Bell = solar('Bell');
export const Building = solar('Building');
export const Building2 = solar('Building2');
export const Calculator = solar('Calculator');
export const Calendar = solar('Calendar');
export const Camera = solar('Camera');
export const Check = solar('Check');
export const CheckCheck = solar('CheckCheck');
export const CheckCircle2 = solar('CheckCircle2');
export const ChevronDown = solar('ChevronDown');
export const ChevronLeft = solar('ChevronLeft');
export const ChevronRight = solar('ChevronRight');
export const ChevronUp = solar('ChevronUp');
export const CircleCheck = solar('CircleCheck');
export const Clock = solar('Clock');
export const Columns = solar('Columns');
export const Copy = solar('Copy');
export const CornerDownLeft = solar('CornerDownLeft');
export const Cpu = solar('Cpu');
export const CreditCard = solar('CreditCard');
export const DollarSign = solar('DollarSign');
export const DoorOpen = solar('DoorOpen');
export const Download = solar('Download');
export const ExternalLink = solar('ExternalLink');
export const Eye = solar('Eye');
export const EyeOff = solar('EyeOff');
export const FileCheck = solar('FileCheck');
export const FileCheck2 = solar('FileCheck2');
export const FileSignature = solar('FileSignature');
export const FileText = solar('FileText');
export const Filter = solar('Filter');
export const Hash = solar('Hash');
export const HelpCircle = solar('HelpCircle');
export const Home = solar('Home');
export const Info = solar('Info');
export const Kanban = solar('Kanban');
export const Layers = solar('Layers');
export const List = solar('List');
export const Loader2 = solar('Loader2');
export const Lock = solar('Lock');
export const LockKeyhole = solar('LockKeyhole');
export const LogOut = solar('LogOut');
export const Mail = solar('Mail');
export const MessageSquare = solar('MessageSquare');
export const Mic = solar('Mic');
export const MoreHorizontal = solar('MoreHorizontal');
export const PanelLeftClose = solar('PanelLeftClose');
export const PanelLeftOpen = solar('PanelLeftOpen');
export const Pencil = solar('Pencil');
export const Phone = solar('Phone');
export const Pill = solar('Pill');
export const Plus = solar('Plus');
export const Printer = solar('Printer');
export const QrCode = solar('QrCode');
export const Receipt = solar('Receipt');
export const RefreshCw = solar('RefreshCw');
export const RotateCcw = solar('RotateCcw');
export const Scale = solar('Scale');
export const Search = solar('Search');
export const SearchX = solar('SearchX');
export const Send = solar('Send');
export const Settings = solar('Settings');
export const Shield = solar('Shield');
export const ShieldAlert = solar('ShieldAlert');
export const ShieldCheck = solar('ShieldCheck');
export const Smartphone = solar('Smartphone');
export const Sparkles = solar('Sparkles');
export const Stethoscope = solar('Stethoscope');
export const Table = solar('Table');
export const Tag = solar('Tag');
export const Trash2 = solar('Trash2');
export const TrendingDown = solar('TrendingDown');
export const TrendingUp = solar('TrendingUp');
export const TriangleAlert = solar('TriangleAlert');
export const Upload = solar('Upload');
export const User = solar('User');
export const UserCheck = solar('UserCheck');
export const UserPlus = solar('UserPlus');
export const UserRoundCog = solar('UserRoundCog');
export const Users = solar('Users');
export const X = solar('X');
export const XCircle = solar('XCircle');
export const Zap = solar('Zap');
