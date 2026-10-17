// Solar Icon Set by 480 Design, CC BY 4.0. See NOTICE.md.
// Geometry from pinned upstream; colors normalized to currentColor.
export type SolarWeight = 'Linear' | 'Bold';
export interface SolarNode {
  tag: 'path' | 'circle' | 'ellipse';
  attrs: Record<string, string>;
}
export const solarData: Record<string, SolarNode[]> = {
  'Linear:add': [
    {
      tag: 'path',
      attrs: { d: 'M4 12L20 12', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12.0204 4L12.0205 20.0003',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:alt-arrow-down': [
    {
      tag: 'path',
      attrs: {
        d: 'M19 9L12 15L5 9',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:alt-arrow-left': [
    {
      tag: 'path',
      attrs: {
        d: 'M15 5L9 12L15 19',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:alt-arrow-right': [
    {
      tag: 'path',
      attrs: {
        d: 'M9 5L15 12L9 19',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:alt-arrow-up': [
    {
      tag: 'path',
      attrs: {
        d: 'M19 15L12 9L5 15',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:arrow-left': [
    {
      tag: 'path',
      attrs: {
        d: 'M20 12H4M10 18L4 12L10 6',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:arrow-right': [
    {
      tag: 'path',
      attrs: {
        d: 'M4 12H20M14 18L20 12L14 6',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:arrow-right-down': [
    {
      tag: 'path',
      attrs: {
        d: 'M6 6L18 18M9 18L18 18L18 9',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:arrow-right-up': [
    {
      tag: 'path',
      attrs: {
        d: 'M6 18L18 6M18 15V6H9',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:bed': [
    {
      tag: 'path',
      attrs: {
        d: 'M19 20V18.5M5 20V18.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M2 15C2 14.0681 2 13.6022 2.15224 13.2346C2.35523 12.7446 2.74458 12.3552 3.23463 12.1522C3.60218 12 4.06812 12 5 12H19C19.9319 12 20.3978 12 20.7654 12.1522C21.2554 12.3552 21.6448 12.7446 21.8478 13.2346C22 13.6022 22 14.0681 22 15C22 15.9319 22 16.3978 21.8478 16.7654C21.6448 17.2554 21.2554 17.6448 20.7654 17.8478C20.3978 18 19.9319 18 19 18H5C4.06812 18 3.60218 18 3.23463 17.8478C2.74458 17.6448 2.35523 17.2554 2.15224 16.7654C2 16.3978 2 15.9319 2 15Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M21 12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M18.5 12V10.5C18.5 8.61438 18.5 7.67157 17.9142 7.08579C17.3284 6.5 16.3856 6.5 14.5 6.5H9.5C7.61438 6.5 6.67157 6.5 6.08579 7.08579C5.5 7.67157 5.5 8.61438 5.5 10.5V12',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 7V12', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:bell': [
    {
      tag: 'path',
      attrs: {
        d: 'M18.7491 9.70957V9.00496C18.7491 5.13623 15.7274 2 12 2C8.27256 2 5.25087 5.13623 5.25087 9.00496V9.70957C5.25087 10.5552 5.00972 11.3818 4.5578 12.0854L3.45036 13.8095C2.43882 15.3843 3.21105 17.5249 4.97036 18.0229C9.57274 19.3257 14.4273 19.3257 19.0296 18.0229C20.789 17.5249 21.5612 15.3843 20.5496 13.8095L19.4422 12.0854C18.9903 11.3818 18.7491 10.5552 18.7491 9.70957Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M7.5 19C8.15503 20.7478 9.92246 22 12 22C14.0775 22 15.845 20.7478 16.5 19',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:bill': [
    {
      tag: 'path',
      attrs: {
        d: 'M17.625 21.0002C18.2666 20.4299 19.2334 20.4299 19.875 21.0002C20.3109 21.3876 21 21.0782 21 20.495V3.50519C21 2.92196 20.3109 2.61251 19.875 2.99999C19.2334 3.57029 18.2666 3.57029 17.625 2.99999C16.9834 2.42969 16.0166 2.42969 15.375 2.99999C14.7334 3.57029 13.7666 3.57029 13.125 2.99999C12.4834 2.42969 11.5166 2.42969 10.875 2.99999C10.2334 3.57029 9.26659 3.57029 8.625 2.99999C7.98341 2.42969 7.01659 2.42969 6.375 2.99999C5.73341 3.57029 4.76659 3.57029 4.125 2.99999C3.68909 2.61251 3 2.92196 3 3.50519V20.495C3 21.0782 3.68909 21.3876 4.125 21.0002C4.76659 20.4299 5.73341 20.4299 6.375 21.0002C7.01659 21.5705 7.98341 21.5705 8.625 21.0002C9.26659 20.4299 10.2334 20.4299 10.875 21.0002C11.5166 21.5705 12.4834 21.5705 13.125 21.0002C13.7666 20.4299 14.7334 20.4299 15.375 21.0002C16.0166 21.5705 16.9834 21.5705 17.625 21.0002Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M7.5 15.5H16.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M7.5 12H16.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M7.5 8.5H16.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:bolt': [
    {
      tag: 'path',
      attrs: {
        d: 'M5.66953 9.91436L8.73167 5.77133C10.711 3.09327 11.7007 1.75425 12.6241 2.03721C13.5474 2.32018 13.5474 3.96249 13.5474 7.24712V7.55682C13.5474 8.74151 13.5474 9.33386 13.926 9.70541L13.946 9.72466C14.3327 10.0884 14.9492 10.0884 16.1822 10.0884C18.4011 10.0884 19.5106 10.0884 19.8855 10.7613C19.8917 10.7724 19.8977 10.7837 19.9036 10.795C20.2576 11.4784 19.6152 12.3475 18.3304 14.0857L15.2683 18.2287C13.2889 20.9067 12.2992 22.2458 11.3758 21.9628C10.4525 21.6798 10.4525 20.0375 10.4525 16.7528L10.4526 16.4433C10.4526 15.2585 10.4526 14.6662 10.074 14.2946L10.054 14.2754C9.6673 13.9117 9.05079 13.9117 7.81775 13.9117C5.59888 13.9117 4.48945 13.9117 4.1145 13.2387C4.10829 13.2276 4.10225 13.2164 4.09639 13.205C3.74244 12.5217 4.3848 11.6526 5.66953 9.91436Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:book-bookmark': [
    {
      tag: 'path',
      attrs: {
        d: 'M4 8C4 5.17157 4 3.75736 4.87868 2.87868C5.75736 2 7.17157 2 10 2H14C16.8284 2 18.2426 2 19.1213 2.87868C20 3.75736 20 5.17157 20 8V16C20 18.8284 20 20.2426 19.1213 21.1213C18.2426 22 16.8284 22 14 22H10C7.17157 22 5.75736 22 4.87868 21.1213C4 20.2426 4 18.8284 4 16V8Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M8 7H16', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M8 10.5H13', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M13 16V19.5309C13 19.8065 13 19.9443 12.9051 20C12.8103 20.0557 12.6806 19.9941 12.4211 19.8708L11.1789 19.2808C11.0911 19.2391 11.0472 19.2182 11 19.2182C10.9528 19.2182 10.9089 19.2391 10.8211 19.2808L9.57889 19.8708C9.31943 19.9941 9.18971 20.0557 9.09485 20C9 19.9443 9 19.8065 9 19.5309V16',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M20 16H7.8981C6.96812 16 6.50314 16 6.12164 16.1022C5.08636 16.3796 4.29937 17.109 4.02197 18.1443',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:buildings': [
    {
      tag: 'path',
      attrs: { d: 'M22 22L2 22', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M21 22V6C21 4.11438 21 3.17157 20.4143 2.58579C19.8285 2 18.8857 2 17 2H15C13.1144 2 12.1716 2 11.5858 2.58579C11.1143 3.05733 11.0223 3.76022 11.0044 5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M15 22V9C15 7.11438 15 6.17157 14.4142 5.58579C13.8284 5 12.8856 5 11 5H7C5.11438 5 4.17157 5 3.58579 5.58579C3 6.17157 3 7.11438 3 9V22',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M9 22V19', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M6 8H12', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M6 11H12', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M6 14H12', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:calculator': [
    {
      tag: 'path',
      attrs: {
        d: 'M4.31802 20.5355C5.63604 22 7.75736 22 12 22C16.2426 22 18.364 22 19.682 20.5355C21 19.0711 21 16.714 21 12C21 7.28595 21 4.92893 19.682 3.46447C18.364 2 16.2426 2 12 2C7.75736 2 5.63604 2 4.31802 3.46447C3 4.92893 3 7.28595 3 12C3 16.714 3 19.0711 4.31802 20.5355Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M7 8C7 7.53501 7 7.30252 7.05111 7.11177C7.18981 6.59413 7.59413 6.18981 8.11177 6.05111C8.30252 6 8.53501 6 9 6H15C15.465 6 15.6975 6 15.8882 6.05111C16.4059 6.18981 16.8102 6.59413 16.9489 7.11177C17 7.30252 17 7.53501 17 8C17 8.46499 17 8.69748 16.9489 8.88823C16.8102 9.40587 16.4059 9.81019 15.8882 9.94889C15.6975 10 15.465 10 15 10H9C8.53501 10 8.30252 10 8.11177 9.94889C7.59413 9.81019 7.18981 9.40587 7.05111 8.88823C7 8.69748 7 8.46499 7 8Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M8 13H8.009M11.991 13H12M15.991 13H16',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M8 17H8.009M11.991 17H12M15.991 17H16',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:calendar': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M7 4V2.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M17 4V2.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M2.5 9H21.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17 13H17.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 13H12.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M7 13H7.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17 17.0234H17.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 17.0234H12.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M7 17.0234H7.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:camera': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '13',
        r: '3',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M9.77778 21H14.2222C17.3433 21 18.9038 21 20.0248 20.2646C20.51 19.9462 20.9267 19.5371 21.251 19.0607C22 17.9601 22 16.4279 22 13.3636C22 10.2994 22 8.76721 21.251 7.6666C20.9267 7.19014 20.51 6.78104 20.0248 6.46268C19.3044 5.99013 18.4027 5.82123 17.022 5.76086C16.3631 5.76086 15.7959 5.27068 15.6667 4.63636C15.4728 3.68489 14.6219 3 13.6337 3H10.3663C9.37805 3 8.52715 3.68489 8.33333 4.63636C8.20412 5.27068 7.63685 5.76086 6.978 5.76086C5.59733 5.82123 4.69555 5.99013 3.97524 6.46268C3.48995 6.78104 3.07328 7.19014 2.74902 7.6666C2 8.76721 2 10.2994 2 13.3636C2 16.4279 2 17.9601 2.74902 19.0607C3.07328 19.5371 3.48995 19.9462 3.97524 20.2646C5.09624 21 6.65675 21 9.77778 21Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M19 10H18', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:card': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M10 16H6', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M14 16H12.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M2 10L22 10', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:chart': [
    {
      tag: 'path',
      attrs: { d: 'M22 22H2', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M21 22V14.5C21 13.6716 20.3284 13 19.5 13H16.5C15.6716 13 15 13.6716 15 14.5V22',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M15 22V5C15 3.58579 15 2.87868 14.5607 2.43934C14.1213 2 13.4142 2 12 2C10.5858 2 9.87868 2 9.43934 2.43934C9 2.87868 9 3.58579 9 5V22',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M9 22V9.5C9 8.67157 8.32843 8 7.5 8H4.5C3.67157 8 3 8.67157 3 9.5V22',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:chat-square': [
    {
      tag: 'path',
      attrs: {
        d: 'M14.5972 19.2098C14.2595 19.4062 14.0492 19.7614 13.6288 20.4718L13.0867 21.3877C12.6035 22.204 11.3965 22.204 10.9133 21.3877L10.3712 20.4718C9.95073 19.7614 9.74049 19.4063 9.40279 19.2098C9.06509 19.0134 8.63992 19.0061 7.78958 18.9915C6.53422 18.9698 5.74689 18.8929 5.08658 18.6194C3.86144 18.1119 2.88807 17.1386 2.3806 15.9134C2 14.9946 2 13.8297 2 11.5V10.5C2 7.22657 2 5.58985 2.7368 4.38751C3.14908 3.71473 3.71473 3.14908 4.38751 2.7368C5.58985 2 7.22657 2 10.5 2H13.5C16.7734 2 18.4101 2 19.6125 2.7368C20.2853 3.14908 20.8509 3.71473 21.2632 4.38751C22 5.58985 22 7.22657 22 10.5V11.5C22 13.8297 22 14.9946 21.6194 15.9134C21.1119 17.1386 20.1386 18.1119 18.9134 18.6194C18.2531 18.8929 17.4658 18.9698 16.2104 18.9915C15.36 19.0061 14.9349 19.0134 14.5972 19.2098Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:check': [
    {
      tag: 'path',
      attrs: {
        d: 'M5 13L9 17L19 7',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:check-circle': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M8.5 12.5L10.5 14.5L15.5 9.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:check-read': [
    {
      tag: 'path',
      attrs: {
        d: 'M4 12.9L7.14286 16.5L15 7.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M20 7.5625L11.4283 16.5625L11 16',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:clock-circle': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 8V12L14.5 14.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:close': [
    {
      tag: 'path',
      attrs: {
        d: 'M19.0068 5L5.00684 19',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M19 19L5 5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:close-circle': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:copy': [
    {
      tag: 'path',
      attrs: {
        d: 'M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:cpu': [
    {
      tag: 'path',
      attrs: {
        d: 'M7 10C7 8.58579 7 7.87868 7.43934 7.43934C7.87868 7 8.58579 7 10 7H14C15.4142 7 16.1213 7 16.5607 7.43934C17 7.87868 17 8.58579 17 10V14C17 15.4142 17 16.1213 16.5607 16.5607C16.1213 17 15.4142 17 14 17H10C8.58579 17 7.87868 17 7.43934 16.5607C7 16.1213 7 15.4142 7 14V10Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M4 12C4 8.22876 4 6.34315 5.17157 5.17157C6.34315 4 8.22876 4 12 4C15.7712 4 17.6569 4 18.8284 5.17157C20 6.34315 20 8.22876 20 12C20 15.7712 20 17.6569 18.8284 18.8284C17.6569 20 15.7712 20 12 20C8.22876 20 6.34315 20 5.17157 18.8284C4 17.6569 4 15.7712 4 12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M4 12H2', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M22 12H20', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M4 9H2', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M22 9H20', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M4 15H2', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M22 15H20', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 20L12 22', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 2L12 4', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M9 20L9 22', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M9 2L9 4', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M15 20L15 22', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M15 2L15 4', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:danger-circle': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 7V13', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 16H12.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:danger-triangle': [
    {
      tag: 'path',
      attrs: {
        d: 'M5.31171 10.7615C8.23007 5.58716 9.68925 3 12 3C14.3107 3 15.7699 5.58716 18.6883 10.7615L19.0519 11.4063C21.4771 15.7061 22.6897 17.856 21.5937 19.428C20.4978 21 17.7864 21 12.3637 21H11.6363C6.21356 21 3.50217 21 2.40626 19.428C1.31034 17.856 2.52291 15.7061 4.94805 11.4063L5.31171 10.7615Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 8V13', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 16H12.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:document-text': [
    {
      tag: 'path',
      attrs: {
        d: 'M3 10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157C21 4.34315 21 6.22876 21 10V14C21 17.7712 21 19.6569 19.8284 20.8284C18.6569 22 16.7712 22 13 22H11C7.22876 22 5.34315 22 4.17157 20.8284C3 19.6569 3 17.7712 3 14V10Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M8 12H16', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M8 8H16', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M8 16H13', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:dollar': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 6V18', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M15 9.5C15 8.11929 13.6569 7 12 7C10.3431 7 9 8.11929 9 9.5C9 10.8807 10.3431 12 12 12C13.6569 12 15 13.1193 15 14.5C15 15.8807 13.6569 17 12 17C10.3431 17 9 15.8807 9 14.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:download': [
    {
      tag: 'path',
      attrs: {
        d: 'M17 9.00195C19.175 9.01406 20.3529 9.11051 21.1213 9.8789C22 10.7576 22 12.1718 22 15.0002V16.0002C22 18.8286 22 20.2429 21.1213 21.1215C20.2426 22.0002 18.8284 22.0002 16 22.0002H8C5.17157 22.0002 3.75736 22.0002 2.87868 21.1215C2 20.2429 2 18.8286 2 16.0002L2 15.0002C2 12.1718 2 10.7576 2.87868 9.87889C3.64706 9.11051 4.82497 9.01406 7 9.00195',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 2L12 15M15 11.5L12 15L9 11.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:exit': [
    {
      tag: 'path',
      attrs: {
        d: 'M9.02831 4.5H8C5.64298 4.5 4.46447 4.5 3.73223 5.23223C3 5.96447 3 7.14298 3 9.5V14.5C3 16.857 3 18.0355 3.73223 18.7678C4.46447 19.5 5.64298 19.5 8 19.5H9.02831',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M9 6.4764C9 4.18259 9 3.03569 9.70725 2.4087C10.4145 1.78171 11.4955 1.97026 13.6576 2.34736L15.9864 2.75354C18.3809 3.17118 19.5781 3.37999 20.2891 4.25826C21 5.13652 21 6.40672 21 8.94711V15.0529C21 17.5933 21 18.8635 20.2891 19.7417C19.5781 20.62 18.3809 20.8288 15.9864 21.2465L13.6576 21.6526C11.4955 22.0297 10.4145 22.2183 9.70725 21.5913C9 20.9643 9 19.8174 9 17.5236V6.4764Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 11V13', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:eye': [
    {
      tag: 'path',
      attrs: {
        d: 'M3.27489 15.2957C2.42496 14.1915 2 13.6394 2 12C2 10.3606 2.42496 9.80853 3.27489 8.70433C4.97196 6.49956 7.81811 4 12 4C16.1819 4 19.028 6.49956 20.7251 8.70433C21.575 9.80853 22 10.3606 22 12C22 13.6394 21.575 14.1915 20.7251 15.2957C19.028 17.5004 16.1819 20 12 20C7.81811 20 4.97196 17.5004 3.27489 15.2957Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:eye-closed': [
    {
      tag: 'path',
      attrs: {
        d: 'M12 14C5 14 2 7 2 7M22 7C22 7 21.0586 9.19661 19 11.1288C18.0872 11.9856 16.9547 12.7904 15.5872 13.3287C14.5334 13.7435 13.34 14 12 14M12 14V16.5M15.5872 13.3287L17 15.5M19 11.1288L20.5 12.6288M8.41281 13.3287L7 15.5M5 11.1288L3.5 12.6288',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:file-check': [
    {
      tag: 'path',
      attrs: {
        d: 'M6 16.5L7.33333 18L10 15',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M13 2.2627V5.0003C13 7.35732 13 8.53583 13.7322 9.26806C14.4645 10.0003 15.643 10.0003 18 10.0003H21.58',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M3.17139 3.17157C4.34296 2 6.23851 2 10.0296 2C11.5546 2 12.3173 2.00011 13.0093 2.26562C13.7012 2.53114 14.2651 3.03857 15.3929 4.05365L19.3516 7.61621C20.6558 8.78998 21.3078 9.3774 21.6538 10.1543C21.9998 10.9312 22 11.8079 22 13.5625V14C22 17.7712 22 19.6566 20.8284 20.8281C19.6569 21.9997 17.7712 22 14 22L9.9969 21.9997C6.22761 21.9997 4.34284 21.9997 3.17157 20.8284C2 19.6569 2 17.7712 2 14V9.9982C2 6.22817 2 4.34296 3.17139 3.17157Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:file-pen': [
    {
      tag: 'path',
      attrs: {
        d: 'M10.0226 12.76L10.3232 12.4594C10.8212 11.9614 11.6285 11.9614 12.1265 12.4594C12.6245 12.9574 12.6245 13.7648 12.1265 14.2628L11.826 14.5633M10.0226 12.76C10.0226 12.76 10.0602 13.3987 10.6237 13.9622C11.1873 14.5258 11.826 14.5633 11.826 14.5633M10.0226 12.76L7.25945 15.5231C7.0723 15.7103 6.97872 15.8039 6.89824 15.9071C6.80331 16.0288 6.72192 16.1605 6.65551 16.2998C6.59922 16.4179 6.55737 16.5435 6.47367 16.7946L6.2057 17.5985M6.2057 17.5985L6.0323 18.1187C5.99112 18.2422 6.02328 18.3785 6.11538 18.4706C6.20748 18.5627 6.34371 18.5948 6.46727 18.5536L6.98745 18.3802L7.79137 18.1123C8.04246 18.0286 8.16801 17.9867 8.28614 17.9304C8.42548 17.864 8.55717 17.7826 8.67888 17.6877C8.78206 17.6072 8.87564 17.5136 9.0628 17.3265L11.826 14.5633M6.98745 18.3802L6.2057 17.5985',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M13 2.2627V5.0003C13 7.35732 13 8.53583 13.7322 9.26806C14.4645 10.0003 15.643 10.0003 18 10.0003H21.58',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M3.17139 3.17157C4.34296 2 6.23851 2 10.0296 2C11.5546 2 12.3173 2.00011 13.0093 2.26562C13.7012 2.53114 14.2651 3.03857 15.3929 4.05365L19.3516 7.61621C20.6558 8.78998 21.3078 9.3774 21.6538 10.1543C21.9998 10.9312 22 11.8079 22 13.5625V14C22 17.7712 22 19.6566 20.8284 20.8281C19.6569 21.9997 17.7712 22 14 22L9.9969 21.9997C6.22761 21.9997 4.34284 21.9997 3.17157 20.8284C2 19.6569 2 17.7712 2 14V9.9982C2 6.22817 2 4.34296 3.17139 3.17157Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:filter': [
    {
      tag: 'path',
      attrs: {
        d: 'M19 3H5C3.58579 3 2.87868 3 2.43934 3.4122C2 3.8244 2 4.48782 2 5.81466V6.50448C2 7.54232 2 8.06124 2.2596 8.49142C2.5192 8.9216 2.99347 9.18858 3.94202 9.72255L6.85504 11.3624C7.49146 11.7206 7.80967 11.8998 8.03751 12.0976C8.51199 12.5095 8.80408 12.9935 8.93644 13.5872C9 13.8722 9 14.2058 9 14.8729L9 17.5424C9 18.452 9 18.9067 9.25192 19.2613C9.50385 19.6158 9.95128 19.7907 10.8462 20.1406C12.7248 20.875 13.6641 21.2422 14.3321 20.8244C15 20.4066 15 19.4519 15 17.5424V14.8729C15 14.2058 15 13.8722 15.0636 13.5872C15.1959 12.9935 15.488 12.5095 15.9625 12.0976C16.1903 11.8998 16.5085 11.7206 17.145 11.3624L20.058 9.72255C21.0065 9.18858 21.4808 8.9216 21.7404 8.49142C22 8.06124 22 7.54232 22 6.50448V5.81466C22 4.48782 22 3.8244 21.5607 3.4122C21.1213 3 20.4142 3 19 3Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:graph-down': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M7 10L9.29289 12.2929C9.68342 12.6834 10.3166 12.6834 10.7071 12.2929L12.2929 10.7071C12.6834 10.3166 13.3166 10.3166 13.7071 10.7071L17 14M14.5 14H17V11.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:graph-up': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M7 14L9.29289 11.7071C9.68342 11.3166 10.3166 11.3166 10.7071 11.7071L12.2929 13.2929C12.6834 13.6834 13.3166 13.6834 13.7071 13.2929L17 10M14.5 10H17V12.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:hashtag': [
    {
      tag: 'path',
      attrs: {
        d: 'M10 3L5 21',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M19 3L14 21',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M22 9H4',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M20 16H2',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:home-2': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274C22 8.77128 22 9.91549 22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 15L12 18', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:hospital': [
    {
      tag: 'path',
      attrs: { d: 'M22 22L2 22', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17 22V6C17 4.11438 17 3.17157 16.4142 2.58579C15.8284 2 14.8856 2 13 2H11C9.11438 2 8.17157 2 7.58579 2.58579C7 3.17157 7 4.11438 7 6V22',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M21 22V8.5C21 7.09554 21 6.39331 20.6629 5.88886C20.517 5.67048 20.3295 5.48298 20.1111 5.33706C19.6067 5 18.9045 5 17.5 5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M3 22V8.5C3 7.09554 3 6.39331 3.33706 5.88886C3.48298 5.67048 3.67048 5.48298 3.88886 5.33706C4.39331 5 5.09554 5 6.5 5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 22V19', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M10 12H14', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M5.5 11H7', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M5.5 14H7', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M17 11H18.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M17 14H18.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M5.5 8H7', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M17 8H18.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M10 15H14', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 9V5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M14 7L10 7',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:info-circle': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 17V11', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 8H12.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:kanban': [
    {
      tag: 'path',
      attrs: {
        d: 'M10 4C10 3.05719 10 2.58579 10.2929 2.29289C10.5858 2 11.0572 2 12 2C12.9428 2 13.4142 2 13.7071 2.29289C14 2.58579 14 3.05719 14 4V10C14 10.9428 14 11.4142 13.7071 11.7071C13.4142 12 12.9428 12 12 12C11.0572 12 10.5858 12 10.2929 11.7071C10 11.4142 10 10.9428 10 10V4Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M3 4C3 3.05719 3 2.58579 3.29289 2.29289C3.58579 2 4.05719 2 5 2C5.94281 2 6.41421 2 6.70711 2.29289C7 2.58579 7 3.05719 7 4V14C7 14.9428 7 15.4142 6.70711 15.7071C6.41421 16 5.94281 16 5 16C4.05719 16 3.58579 16 3.29289 15.7071C3 15.4142 3 14.9428 3 14V4Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17 4C17 3.05719 17 2.58579 17.2929 2.29289C17.5858 2 18.0572 2 19 2C19.9428 2 20.4142 2 20.7071 2.29289C21 2.58579 21 3.05719 21 4V17C21 17.9428 21 18.4142 20.7071 18.7071C20.4142 19 19.9428 19 19 19C18.0572 19 17.5858 19 17.2929 18.7071C17 18.4142 17 17.9428 17 17V4Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:layers': [
    {
      tag: 'path',
      attrs: {
        d: 'M4.97883 9.68508C2.99294 8.89073 2 8.49355 2 8C2 7.50645 2.99294 7.10927 4.97883 6.31492L7.7873 5.19153C9.77318 4.39718 10.7661 4 12 4C13.2339 4 14.2268 4.39718 16.2127 5.19153L19.0212 6.31492C21.0071 7.10927 22 7.50645 22 8C22 8.49355 21.0071 8.89073 19.0212 9.68508L16.2127 10.8085C14.2268 11.6028 13.2339 12 12 12C10.7661 12 9.77318 11.6028 7.7873 10.8085L4.97883 9.68508Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M5.76613 10L4.97883 10.3149C2.99294 11.1093 2 11.5065 2 12C2 12.4935 2.99294 12.8907 4.97883 13.6851L7.7873 14.8085C9.77318 15.6028 10.7661 16 12 16C13.2339 16 14.2268 15.6028 16.2127 14.8085L19.0212 13.6851C21.0071 12.8907 22 12.4935 22 12C22 11.5065 21.0071 11.1093 19.0212 10.3149L18.2339 10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M5.76613 14L4.97883 14.3149C2.99294 15.1093 2 15.5065 2 16C2 16.4935 2.99294 16.8907 4.97883 17.6851L7.7873 18.8085C9.77318 19.6028 10.7661 20 12 20C13.2339 20 14.2268 19.6028 16.2127 18.8085L19.0212 17.6851C21.0071 16.8907 22 16.4935 22 16C22 15.5065 21.0071 15.1093 19.0212 14.3149L18.2339 14',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:letter': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M6 8L8.1589 9.79908C9.99553 11.3296 10.9139 12.0949 12 12.0949C13.0861 12.0949 14.0045 11.3296 15.8411 9.79908L18 8',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:list': [
    {
      tag: 'path',
      attrs: { d: 'M20 7L4 7', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M15 12L4 12', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M9 17H4', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:lock': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.75736 10 5.17157 10 8 10H16C18.8284 10 20.2426 10 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M6 10V8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:lock-keyhole': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.75736 10 5.17157 10 8 10H16C18.8284 10 20.2426 10 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '16',
        r: '2',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M6 10V8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:logout': [
    {
      tag: 'path',
      attrs: {
        d: 'M12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M10 12H20M17 15L20 12L17 9',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:magnifier': [
    {
      tag: 'circle',
      attrs: {
        cx: '11.5',
        cy: '11.5',
        r: '9.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M18.2173 18.2178L21.9999 22.0004',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:magnifier-close': [
    {
      tag: 'circle',
      attrs: {
        cx: '11.5',
        cy: '11.5',
        r: '9.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M9.73223 9.73163L11.5 11.4994M11.5 11.4994L13.2678 13.2672M11.5 11.4994L9.73223 13.2672M11.5 11.4994L13.2678 9.73163',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M18.2173 18.2178L21.9999 22.0004',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:menu-dots': [
    {
      tag: 'circle',
      attrs: {
        cx: '5',
        cy: '12',
        r: '2',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '2',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'circle',
      attrs: {
        cx: '19',
        cy: '12',
        r: '2',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:microphone': [
    {
      tag: 'path',
      attrs: {
        d: 'M7 8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V11C17 13.7614 14.7614 16 12 16C9.23858 16 7 13.7614 7 11V8Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M13 8L17 8', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M13 11L17 11', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M20 10V11C20 15.4183 16.4183 19 12 19C7.58172 19 4 15.4183 4 11V10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 19V22', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:panel-left-close': [
    {
      tag: 'path',
      attrs: {
        d: 'M22 11C22 7.22876 22 5.34315 20.8284 4.17157C19.6569 3 17.7712 3 14 3H10C6.22876 3 4.34315 3 3.17157 4.17157C2 5.34315 2 7.22876 2 11V13C2 16.7712 2 18.6569 3.17157 19.8284C4.34315 21 6.22876 21 10 21H14C17.7712 21 19.6569 21 20.8284 19.8284C22 18.6569 22 16.7712 22 13V11Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M9 21L9 3', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M16.7827 9L14.2113 12L16.7827 15',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:panel-left-open': [
    {
      tag: 'path',
      attrs: {
        d: 'M14.2114 15L16.7829 12L14.2114 9',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M22 13C22 16.7712 22 18.6569 20.8284 19.8284C19.6569 21 17.7712 21 14 21L10 21C6.22876 21 4.34315 21 3.17157 19.8284C2 18.6569 2 16.7712 2 13L2 11C2 7.22876 2 5.34314 3.17158 4.17157C4.34315 3 6.22877 3 10 3L14 3C17.7712 3 19.6569 3 20.8284 4.17157C22 5.34315 22 7.22876 22 11L22 13Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M9 3L9 21', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:pen': [
    {
      tag: 'path',
      attrs: {
        d: 'M14.3601 4.07866L15.2869 3.15178C16.8226 1.61607 19.3125 1.61607 20.8482 3.15178C22.3839 4.68748 22.3839 7.17735 20.8482 8.71306L19.9213 9.63993M14.3601 4.07866C14.3601 4.07866 14.4759 6.04828 16.2138 7.78618C17.9517 9.52407 19.9213 9.63993 19.9213 9.63993M19.9213 9.63993L11.4001 18.1612C10.8229 18.7383 10.5344 19.0269 10.2162 19.2751C9.84082 19.5679 9.43469 19.8189 9.00498 20.0237C8.6407 20.1973 8.25352 20.3263 7.47918 20.5844L4.19792 21.6782L3.39584 21.9456C3.01478 22.0726 2.59466 21.9734 2.31063 21.6894C2.0266 21.4053 1.92743 20.9852 2.05445 20.6042L2.32181 19.8021L3.41556 16.5208C3.67368 15.7465 3.80273 15.3593 3.97634 14.995C4.18114 14.5653 4.43213 14.1592 4.7249 13.7838C4.97308 13.4656 5.26166 13.1771 5.83882 12.5999L14.3601 4.07866M4.19792 21.6782L2.32181 19.8021',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:phone': [
    {
      tag: 'path',
      attrs: {
        d: 'M18.6763 19.9631C19.1917 19.9122 19.6399 19.6343 20.0011 19.254L21.4217 17.7584C22.3806 16.7489 22.1102 15.0182 20.8833 14.312L18.9728 13.2123C18.1672 12.7486 17.1858 12.8848 16.5562 13.5477L16.1007 14.0272C16.1007 14.0272 15.0181 15.167 12.0631 12.0559C9.10812 8.94484 10.1907 7.80507 10.1907 7.80507L10.4775 7.50311C11.1841 6.75924 11.2507 5.56497 10.6342 4.6931L9.37326 2.90961C8.61028 1.8305 7.13596 1.68795 6.26145 2.60864L4.69185 4.26114C4.25823 4.71766 3.96765 5.30945 4.00289 5.96594C4.09304 7.64546 4.81072 11.259 8.81536 15.4752C13.0621 19.9462 17.0468 20.1239 18.6763 19.9631Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:pill': [
    {
      tag: 'path',
      attrs: {
        d: 'M3.99057 13.6019C1.33648 10.9478 1.33648 6.64466 3.99057 3.99057C6.64466 1.33648 10.9478 1.33648 13.6019 3.99057L20.0094 10.3981C22.6635 13.0522 22.6635 17.3553 20.0094 20.0094C17.3553 22.6635 13.0522 22.6635 10.3981 20.0094L3.99057 13.6019Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M16.8057 7.19434C16.8057 7.19434 16.2649 9.99999 13.1322 13.1327C9.99952 16.2653 7.19434 16.8057 7.19434 16.8057',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:plane': [
    {
      tag: 'path',
      attrs: {
        d: 'M18.6357 15.6701L20.3521 10.5208C21.8516 6.02242 22.6013 3.77322 21.414 2.58595C20.2268 1.39869 17.9776 2.14842 13.4792 3.64788L8.32987 5.36432C4.69923 6.57453 2.88392 7.17964 2.36806 8.06698C1.87731 8.91112 1.87731 9.95369 2.36806 10.7978C2.88392 11.6852 4.69923 12.2903 8.32986 13.5005C8.91282 13.6948 9.2043 13.792 9.44793 13.9551C9.68404 14.1131 9.88687 14.316 10.0449 14.5521C10.208 14.7957 10.3052 15.0872 10.4995 15.6701C11.7097 19.3008 12.3148 21.1161 13.2022 21.6319C14.0463 22.1227 15.0889 22.1227 15.933 21.6319C16.8204 21.1161 17.4255 19.3008 18.6357 15.6701Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M10.1353 13.8027L15.6842 8.31497',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:printer': [
    {
      tag: 'path',
      attrs: { d: 'M9 10H6', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M19 14L5 14', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17.9827 6C17.9359 4.44655 17.7626 3.51998 17.1213 2.87868C16.2426 2 14.8284 2 12 2C9.17157 2 7.75736 2 6.87868 2.87868C6.23738 3.51998 6.06413 4.44655 6.01732 6M18 14V16C18 18.8284 18 20.2426 17.1213 21.1213C16.2426 22 14.8284 22 12 22C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V14',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M15 16.5H9', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M13 19H9', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17 10H17.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17.9832 17.9827C17.9888 17.9827 17.9944 17.9827 18 17.9827C19.5535 17.9359 20.48 17.7626 21.1213 17.1213C22 16.2426 22 14.8284 22 12C22 9.17157 22 7.75736 21.1213 6.87868C20.2426 6 18.8284 6 16 6H8C5.17157 6 3.75736 6 2.87868 6.87868C2 7.75736 2 9.17157 2 12C2 14.8284 2 16.2426 2.87868 17.1213C3.51998 17.7626 4.44655 17.9359 6 17.9827H6.01681',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:pulse': [
    {
      tag: 'path',
      attrs: {
        d: 'M5 14.9999H6.39445C7.1804 14.9999 7.57337 14.9999 7.90501 15.1774C8.23665 15.3549 8.45463 15.6819 8.8906 16.3358L9.05039 16.5755C9.47306 17.2095 9.68439 17.5265 9.97087 17.5095C10.2573 17.4925 10.4297 17.1527 10.7743 16.4731L12.7404 12.5964C13.0987 11.8898 13.2779 11.5365 13.5711 11.5247C13.8642 11.5129 14.0711 11.8508 14.485 12.5264L15.1222 13.5668C15.5512 14.2671 15.7656 14.6172 16.1072 14.8086C16.4487 14.9999 16.8593 14.9999 17.6805 14.9999H19',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:qr-code': [
    {
      tag: 'path',
      attrs: {
        d: 'M2 16.9C2 15.5906 2 14.9359 2.29472 14.455C2.45963 14.1859 2.68589 13.9596 2.955 13.7947C3.43594 13.5 4.09063 13.5 5.4 13.5H6.5C8.38562 13.5 9.32843 13.5 9.91421 14.0858C10.5 14.6716 10.5 15.6144 10.5 17.5V18.6C10.5 19.9094 10.5 20.5641 10.2053 21.045C10.0404 21.3141 9.81411 21.5404 9.545 21.7053C9.06406 22 8.40937 22 7.1 22C5.13594 22 4.15391 22 3.4325 21.5579C3.02884 21.3106 2.68945 20.9712 2.44208 20.5675C2 19.8461 2 18.8641 2 16.9Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M13.5 5.4C13.5 4.09063 13.5 3.43594 13.7947 2.955C13.9596 2.68589 14.1859 2.45963 14.455 2.29472C14.9359 2 15.5906 2 16.9 2C18.8641 2 19.8461 2 20.5675 2.44208C20.9712 2.68945 21.3106 3.02884 21.5579 3.4325C22 4.15391 22 5.13594 22 7.1C22 8.40937 22 9.06406 21.7053 9.545C21.5404 9.81411 21.3141 10.0404 21.045 10.2053C20.5641 10.5 19.9094 10.5 18.6 10.5H17.5C15.6144 10.5 14.6716 10.5 14.0858 9.91421C13.5 9.32843 13.5 8.38562 13.5 6.5V5.4Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M19 13.5H17C15.5955 13.5 14.8933 13.5 14.3889 13.8371C14.1705 13.983 13.983 14.1705 13.8371 14.3889C13.5 14.8933 13.5 15.5955 13.5 17M13.5 19V22',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17 22H19C19.9319 22 20.3978 22 20.7654 21.8478C21.2554 21.6448 21.6448 21.2554 21.8478 20.7654C22 20.3978 22 19.9319 22 19M22 17V13.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M2 7.1C2 5.13594 2 4.15391 2.44208 3.4325C2.68945 3.02884 3.02884 2.68945 3.4325 2.44208C4.15391 2 5.13594 2 7.1 2C8.40937 2 9.06406 2 9.545 2.29472C9.81411 2.45963 10.0404 2.68589 10.2053 2.955C10.5 3.43594 10.5 4.09063 10.5 5.4V6.5C10.5 8.38562 10.5 9.32843 9.91421 9.91421C9.32843 10.5 8.38562 10.5 6.5 10.5H5.4C4.09063 10.5 3.43594 10.5 2.955 10.2053C2.68589 10.0404 2.45963 9.81411 2.29472 9.545C2 9.06406 2 8.40937 2 7.1Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M6.25 17.25C6.49535 17.25 6.63831 17.2518 6.73926 17.2598C6.74734 17.3608 6.75 17.5038 6.75 17.75C6.75 17.9954 6.74727 18.1383 6.73926 18.2393C6.63831 18.2473 6.49541 18.25 6.25 18.25C6.0038 18.25 5.86077 18.2473 5.75977 18.2393C5.75176 18.1383 5.75 17.9953 5.75 17.75C5.75 17.5039 5.75169 17.3608 5.75977 17.2598C5.86077 17.2517 6.00387 17.25 6.25 17.25Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M6.25 5.75C6.49535 5.75 6.63831 5.75176 6.73926 5.75977C6.74734 5.86077 6.75 6.0038 6.75 6.25C6.75 6.49541 6.74727 6.63831 6.73926 6.73926C6.63831 6.74727 6.49541 6.75 6.25 6.75C6.0038 6.75 5.86077 6.74734 5.75977 6.73926C5.75176 6.63831 5.75 6.49535 5.75 6.25C5.75 6.00387 5.75169 5.86077 5.75977 5.75977C5.86077 5.75169 6.00387 5.75 6.25 5.75Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M17.75 5.75C17.9953 5.75 18.1383 5.75176 18.2393 5.75977C18.2473 5.86077 18.25 6.0038 18.25 6.25C18.25 6.49541 18.2473 6.63831 18.2393 6.73926C18.1383 6.74727 17.9954 6.75 17.75 6.75C17.5038 6.75 17.3608 6.74734 17.2598 6.73926C17.2518 6.63831 17.25 6.49535 17.25 6.25C17.25 6.00387 17.2517 5.86077 17.2598 5.75977C17.3608 5.75169 17.5039 5.75 17.75 5.75Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M16.75 17.75C16.75 17.3487 16.75 17.1481 16.8463 17.004C16.888 16.9416 16.9416 16.888 17.004 16.8463C17.1481 16.75 17.3487 16.75 17.75 16.75C18.1513 16.75 18.3519 16.75 18.496 16.8463C18.5584 16.888 18.612 16.9416 18.6537 17.004C18.75 17.1481 18.75 17.3487 18.75 17.75C18.75 18.1513 18.75 18.3519 18.6537 18.496C18.612 18.5584 18.5584 18.612 18.496 18.6537C18.3519 18.75 18.1513 18.75 17.75 18.75C17.3487 18.75 17.1481 18.75 17.004 18.6537C16.9416 18.612 16.888 18.5584 16.8463 18.496C16.75 18.3519 16.75 18.1513 16.75 17.75Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:question-circle': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M10.125 8.875C10.125 7.83947 10.9645 7 12 7C13.0355 7 13.875 7.83947 13.875 8.875C13.875 9.56245 13.505 10.1635 12.9534 10.4899C12.478 10.7711 12 11.1977 12 11.75V13',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 16H12.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:refresh': [
    {
      tag: 'path',
      attrs: {
        d: 'M3.67981 13L3.67981 11.3333C3.67981 6.73096 7.4402 3 12.0789 3C15.1178 3 17.7799 4.60136 19.2545 7M2 11.3333L3.67981 13L5.35962 11.3333',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M20.3139 11V12.6667C20.3139 17.269 16.5391 21 11.8827 21C8.83213 21 6.15995 19.3986 4.67969 17M22.0001 12.6667L20.3139 11L18.6277 12.6667',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:restart': [
    {
      tag: 'path',
      attrs: {
        d: 'M18.364 8.04928L17.6569 7.34217C14.5327 4.21798 9.46734 4.21798 6.34315 7.34217C3.21895 10.4664 3.21895 15.5317 6.34315 18.6559C9.46734 21.7801 14.5327 21.7801 17.6569 18.6559C19.4737 16.8391 20.234 14.3658 19.9377 11.9995M18.364 3.80664V8.04928H14.1213',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:settings': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '3',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8477 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.902C15.0117 19.3443 15.2977 18.8281 15.781 18.549C16.2643 18.2699 16.8544 18.2804 17.3479 18.5412C17.6836 18.7186 17.927 18.8172 18.167 18.8488C18.6929 18.9181 19.2248 18.7756 19.6456 18.4527C19.9612 18.2105 20.1942 17.807 20.6601 16.9999C21.1261 16.1929 21.3591 15.7894 21.411 15.395C21.4802 14.8691 21.3377 14.3372 21.0148 13.9164C20.8674 13.7243 20.6602 13.5628 20.3387 13.3608C19.8662 13.0639 19.5621 12.558 19.5621 11.9999C19.5621 11.4418 19.8662 10.9361 20.3387 10.6392C20.6603 10.4371 20.8675 10.2757 21.0149 10.0835C21.3378 9.66273 21.4803 9.13087 21.4111 8.60497C21.3592 8.21055 21.1262 7.80703 20.6602 7C20.1943 6.19297 19.9613 5.78945 19.6457 5.54727C19.2249 5.22436 18.693 5.08185 18.1671 5.15109C17.9271 5.18269 17.6837 5.28136 17.3479 5.4588C16.8545 5.71959 16.2644 5.73002 15.7811 5.45096C15.2977 5.17191 15.0117 4.65566 14.9909 4.09794C14.9767 3.71848 14.9404 3.45833 14.8477 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:shield': [
    {
      tag: 'path',
      attrs: {
        d: 'M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M3 11L12 8L21 11', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 2V21.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:shield-check': [
    {
      tag: 'path',
      attrs: {
        d: 'M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M9.5 12.4L10.9286 14L14.5 10',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:shield-warning': [
    {
      tag: 'path',
      attrs: {
        d: 'M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 8V12', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 15H12.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:smartphone': [
    {
      tag: 'path',
      attrs: {
        d: 'M4 10C4 6.22876 4 4.34315 5.17157 3.17157C6.34315 2 8.22876 2 12 2C15.7712 2 17.6569 2 18.8284 3.17157C20 4.34315 20 6.22876 20 10V14C20 17.7712 20 19.6569 18.8284 20.8284C17.6569 22 15.7712 22 12 22C8.22876 22 6.34315 22 5.17157 20.8284C4 19.6569 4 17.7712 4 14V10Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M15 19H9', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:square-top-down': [
    {
      tag: 'path',
      attrs: {
        d: 'M13 11L22 2M22 7.34375V2H16.6562',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:stars': [
    {
      tag: 'path',
      attrs: {
        d: 'M8.03339 3.65784C8.37932 2.78072 9.62068 2.78072 9.96661 3.65785L11.0386 6.37599C11.1442 6.64378 11.3562 6.85576 11.624 6.96137L14.3422 8.03339C15.2193 8.37932 15.2193 9.62068 14.3422 9.96661L11.624 11.0386C11.3562 11.1442 11.1442 11.3562 11.0386 11.624L9.96661 14.3422C9.62067 15.2193 8.37932 15.2193 8.03339 14.3422L6.96137 11.624C6.85575 11.3562 6.64378 11.1442 6.37599 11.0386L3.65784 9.96661C2.78072 9.62067 2.78072 8.37932 3.65785 8.03339L6.37599 6.96137C6.64378 6.85575 6.85576 6.64378 6.96137 6.37599L8.03339 3.65784Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M16.4885 13.3481C16.6715 12.884 17.3285 12.884 17.5115 13.3481L18.3121 15.3781C18.368 15.5198 18.4802 15.632 18.6219 15.6879L20.6519 16.4885C21.116 16.6715 21.116 17.3285 20.6519 17.5115L18.6219 18.3121C18.4802 18.368 18.368 18.4802 18.3121 18.6219L17.5115 20.6519C17.3285 21.116 16.6715 21.116 16.4885 20.6519L15.6879 18.6219C15.632 18.4802 15.5198 18.368 15.3781 18.3121L13.3481 17.5115C12.884 17.3285 12.884 16.6715 13.3481 16.4885L15.3781 15.6879C15.5198 15.632 15.632 15.5198 15.6879 15.3781L16.4885 13.3481Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:stethoscope': [
    {
      tag: 'path',
      attrs: {
        d: 'M9 14.2354V17.0001C9 19.7615 11.2386 22.0001 14 22.0001H14.8824C16.7691 22.0001 18.3595 20.7311 18.8465 19.0001',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M5.42857 3H5.3369C5.02404 3 4.86761 3 4.73574 3.01166C3.28763 3.13972 2.13972 4.28763 2.01166 5.73574C2 5.86761 2 6.02404 2 6.3369V7.23529C2 11.1013 5.13401 14.2353 9 14.2353C12.7082 14.2353 15.7143 11.2292 15.7143 7.521V6.3369C15.7143 6.02404 15.7143 5.86761 15.7026 5.73574C15.5746 4.28763 14.4267 3.13972 12.9785 3.01166C12.8467 3 12.6902 3 12.3774 3H12.2857',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'circle',
      attrs: {
        cx: '19',
        cy: '16',
        r: '3',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 2V4', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M6 2V4', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:table': [
    {
      tag: 'path',
      attrs: { d: 'M3 15.333L21 15.333', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M3 8.6665L21 8.6665', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M12 2L12 22', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M13 2C16.7712 2 18.6569 2 19.8284 3.17157C21 4.34315 21 6.22876 21 10L21 14C21 17.7712 21 19.6569 19.8284 20.8284C18.6569 22 16.7712 22 13 22L11 22C7.22876 22 5.34315 22 4.17157 20.8284C3 19.6569 3 17.7712 3 14L3 10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2L13 2Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:table-columns-split': [
    {
      tag: 'path',
      attrs: { d: 'M2 15.333L11 15.333', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M2 8.6665L11 8.6665', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M5 2.00873L5 21.9913',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M13.5 2.00873L13.5 3.67261M13.5 20.3501L13.5 22.014M13.5 7.00262L13.5 10.3487M13.5 13.66L13.5 17.0061',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M2 2L3 2C6.77124 2 8.65685 2 9.82843 3.17157C11 4.34315 11 6.22876 11 10L11 14C11 17.7712 11 19.6569 9.82843 20.8284C8.65685 22 6.77124 22 3 22L2 22',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M21.9985 15.333L16.0043 15.333',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M21.9918 2.00885C19.5201 2.04516 18.1175 2.23006 17.176 3.17155C16.0044 4.34312 16.0044 6.22874 16.0044 9.99998L16.0044 14C16.0044 17.7712 16.0044 19.6568 17.176 20.8284C18.1183 21.7708 19.5227 21.9551 21.9987 21.9912',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M21.9941 8.6665L16.0043 8.6665',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:tag': [
    {
      tag: 'path',
      attrs: {
        d: 'M4.72848 16.1369C3.18295 14.5914 2.41018 13.8186 2.12264 12.816C1.83509 11.8134 2.08083 10.7485 2.57231 8.61875L2.85574 7.39057C3.26922 5.59881 3.47597 4.70292 4.08944 4.08944C4.70292 3.47597 5.59881 3.26922 7.39057 2.85574L8.61875 2.57231C10.7485 2.08083 11.8134 1.83509 12.816 2.12264C13.8186 2.41018 14.5914 3.18295 16.1369 4.72848L17.9665 6.55812C20.6555 9.24711 22 10.5916 22 12.2623C22 13.933 20.6555 15.2775 17.9665 17.9665C15.2775 20.6555 13.933 22 12.2623 22C10.5916 22 9.24711 20.6555 6.55812 17.9665L4.72848 16.1369Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'circle',
      attrs: {
        cx: '8.60724',
        cy: '8.87891',
        r: '2',
        transform: 'rotate(-45 8.60724 8.87891)',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M11.5417 18.5L18.5208 11.5208',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:trash-bin-trash': [
    {
      tag: 'path',
      attrs: { d: 'M20.5001 6H3.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M9.5 11L10 16', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M14.5 11L14 16', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:undo-left': [
    {
      tag: 'path',
      attrs: {
        d: 'M4 7H15C16.8692 7 17.8039 7 18.5 7.40193C18.9561 7.66523 19.3348 8.04394 19.5981 8.49999C20 9.19615 20 10.1308 20 12C20 13.8692 20 14.8038 19.5981 15.5C19.3348 15.9561 18.9561 16.3348 18.5 16.5981C17.8039 17 16.8692 17 15 17H8.00001M7 10L4 7L7 4',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:upload': [
    {
      tag: 'path',
      attrs: {
        d: 'M17 9.00195C19.175 9.01406 20.3529 9.11051 21.1213 9.8789C22 10.7576 22 12.1718 22 15.0002V16.0002C22 18.8286 22 20.2429 21.1213 21.1215C20.2426 22.0002 18.8284 22.0002 16 22.0002H8C5.17157 22.0002 3.75736 22.0002 2.87868 21.1215C2 20.2429 2 18.8286 2 16.0002L2 15.0002C2 12.1718 2 10.7576 2.87868 9.87889C3.64706 9.11051 4.82497 9.01406 7 9.00195',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 15L12 2M9 5.5L12 2L15 5.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
  ],
  'Linear:user': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '6',
        r: '4',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:user-check': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '6',
        r: '4',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M16.6665 16L17.5 17L19.3332 15.1111',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M22 16C22 18.2091 20.2091 20 18 20C15.7909 20 14 18.2091 14 16C14 13.7909 15.7909 12 18 12C20.2091 12 22 13.7909 22 16Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M15.02 13.3317C14.0882 13.1178 13.0685 13 12 13C7.58172 13 4 15.0147 4 17.5C4 19.9853 4 22 12 22C17.5794 22 19.2676 21.02 19.7784 19.5839',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:user-id': [
    {
      tag: 'circle',
      attrs: { cx: '9', cy: '9', r: '2', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M13 15C13 16.1046 13 17 9 17C5 17 5 16.1046 5 15C5 13.8954 6.79086 13 9 13C11.2091 13 13 13.8954 13 15Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: { d: 'M19 12H15', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M19 9H14', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: { d: 'M19 15H16', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
  ],
  'Linear:user-plus': [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '6',
        r: '4',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M18 14.6667V17.3333',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M16.6665 16L19.3332 16',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M22 16C22 18.2091 20.2091 20 18 20C15.7909 20 14 18.2091 14 16C14 13.7909 15.7909 12 18 12C20.2091 12 22 13.7909 22 16Z',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M15.02 13.3317C14.0882 13.1178 13.0685 13 12 13C7.58172 13 4 15.0147 4 17.5C4 19.9853 4 22 12 22C17.5794 22 19.2676 21.02 19.7784 19.5839',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Linear:users-group-rounded': [
    {
      tag: 'circle',
      attrs: { cx: '9', cy: '6', r: '4', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M15 9C16.6569 9 18 7.65685 18 6C18 4.34315 16.6569 3 15 3',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'ellipse',
      attrs: {
        cx: '9',
        cy: '17',
        rx: '7',
        ry: '4',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M18 14C19.7542 14.3847 21 15.3589 21 16.5C21 17.5293 19.9863 18.4229 18.5 18.8704',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      },
    },
  ],
  'Bold:bill': [
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M19.875 20.5917C19.2334 20.0473 18.2666 20.0473 17.625 20.5917C16.9834 21.1361 16.0166 21.1361 15.375 20.5917C14.7334 20.0473 13.7666 20.0473 13.125 20.5917C12.4834 21.1361 11.5166 21.1361 10.875 20.5917C10.2334 20.0473 9.26659 20.0473 8.625 20.5917C7.98341 21.1361 7.01659 21.1361 6.375 20.5917C5.73341 20.0473 4.76659 20.0473 4.125 20.5917C3.68909 20.9616 3 20.6662 3 20.1094V3.89059C3 3.33383 3.68909 3.03842 4.125 3.40832C4.76659 3.95274 5.73341 3.95274 6.375 3.40832C7.01659 2.86389 7.98341 2.86389 8.625 3.40832C9.26659 3.95274 10.2334 3.95274 10.875 3.40832C11.5166 2.86389 12.4834 2.86389 13.125 3.40832C13.7666 3.95274 14.7334 3.95274 15.375 3.40832C16.0166 2.86389 16.9834 2.86389 17.625 3.40832C18.2666 3.95274 19.2334 3.95274 19.875 3.40832C20.3109 3.03842 21 3.33383 21 3.89059V20.1094C21 20.6662 20.3109 20.9616 19.875 20.5917ZM6.75 12C6.75 11.5858 7.08579 11.25 7.5 11.25H16.5C16.9142 11.25 17.25 11.5858 17.25 12C17.25 12.4142 16.9142 12.75 16.5 12.75H7.5C7.08579 12.75 6.75 12.4142 6.75 12ZM7.5 7.75C7.08579 7.75 6.75 8.08579 6.75 8.5C6.75 8.91421 7.08579 9.25 7.5 9.25H16.5C16.9142 9.25 17.25 8.91421 17.25 8.5C17.25 8.08579 16.9142 7.75 16.5 7.75H7.5ZM6.75 15.5C6.75 15.0858 7.08579 14.75 7.5 14.75H16.5C16.9142 14.75 17.25 15.0858 17.25 15.5C17.25 15.9142 16.9142 16.25 16.5 16.25H7.5C7.08579 16.25 6.75 15.9142 6.75 15.5Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:card': [
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M22 12C22 15.7712 21.9997 17.6566 20.8281 18.8281C19.6566 19.9997 17.7712 20 14 20H10C6.22876 20 4.34345 19.9997 3.17188 18.8281C2.0003 17.6566 2 15.7712 2 12C2 11.5581 2.00007 11.142 2.00195 10.75H21.998C21.9999 11.142 22 11.5581 22 12ZM6 15.25C5.58579 15.25 5.25 15.5858 5.25 16C5.25 16.4142 5.58579 16.75 6 16.75H10C10.4142 16.75 10.75 16.4142 10.75 16C10.75 15.5858 10.4142 15.25 10 15.25H6ZM12.5 15.25C12.0858 15.25 11.75 15.5858 11.75 16C11.75 16.4142 12.0858 16.75 12.5 16.75H14C14.4142 16.75 14.75 16.4142 14.75 16C14.75 15.5858 14.4142 15.25 14 15.25H12.5Z',
        fill: 'currentColor',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M14 4C17.7711 4 19.6565 4.00038 20.8281 5.17188C21.6717 6.01542 21.9085 7.22882 21.9746 9.25H2.02637C2.0925 7.2289 2.3284 6.01541 3.17188 5.17188C4.34343 4.00032 6.22887 4 10 4H14Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:chart': [
    {
      tag: 'path',
      attrs: {
        d: 'M20 13.75C20 13.3358 19.6642 13 19.25 13H16.25C15.8358 13 15.5 13.3358 15.5 13.75V20.5H14V4.25C14 3.52169 13.9984 3.05091 13.9518 2.70403C13.908 2.37872 13.8374 2.27676 13.7803 2.21967C13.7232 2.16258 13.6213 2.09197 13.296 2.04823C12.9491 2.00159 12.4783 2 11.75 2C11.0217 2 10.5509 2.00159 10.204 2.04823C9.87872 2.09197 9.77676 2.16258 9.71967 2.21967C9.66258 2.27676 9.59196 2.37872 9.54823 2.70403C9.50159 3.05091 9.5 3.52169 9.5 4.25V20.5H8V8.75C8 8.33579 7.66421 8 7.25 8H4.25C3.83579 8 3.5 8.33579 3.5 8.75V20.5H2H1.75C1.33579 20.5 1 20.8358 1 21.25C1 21.6642 1.33579 22 1.75 22H21.75C22.1642 22 22.5 21.6642 22.5 21.25C22.5 20.8358 22.1642 20.5 21.75 20.5H21.5H20V13.75Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:exit': [
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M9.70703 2.40924C10.4142 1.78228 11.4954 1.97065 13.6572 2.34772L15.9863 2.75397C18.3806 3.17157 19.5781 3.37984 20.2891 4.25788C21 5.13614 21 6.40693 21 8.94733V15.0528C21 17.5932 21 18.864 20.2891 19.7423C19.5781 20.6203 18.3806 20.8286 15.9863 21.2462L13.6572 21.6524C11.4954 22.0295 10.4142 22.2178 9.70703 21.5909C9.00014 20.9638 9 19.8169 9 17.5235V6.47663C9 4.18321 9.00014 3.0363 9.70703 2.40924ZM12 10.169C11.5859 10.169 11.2502 10.5199 11.25 10.9532V13.0469C11.2502 13.4802 11.5859 13.8311 12 13.8311C12.4141 13.8311 12.7498 13.4802 12.75 13.0469V10.9532C12.7498 10.5199 12.4141 10.169 12 10.169Z',
        fill: 'currentColor',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M7.54688 4.50006C7.49956 5.12336 7.49992 5.84431 7.5 6.62311V17.377C7.49992 18.1558 7.49955 18.8768 7.54688 19.5001C5.4889 19.4971 4.41615 19.4513 3.73242 18.7676C3.00021 18.0354 3 16.8569 3 14.5001V9.50006C3 7.14316 3.0003 5.96473 3.73242 5.23249C4.41615 4.54876 5.48879 4.50306 7.54688 4.50006Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:file-check': [
    {
      tag: 'path',
      attrs: {
        d: 'M19.3517 7.61665L15.3929 4.05375C14.2651 3.03868 13.7012 2.53114 13.0092 2.26562L13 5.00011C13 7.35713 13 8.53564 13.7322 9.26787C14.4645 10.0001 15.643 10.0001 18 10.0001H21.5801C21.2175 9.29588 20.5684 8.71164 19.3517 7.61665Z',
        fill: 'currentColor',
      },
    },
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V10C2 6.22876 2 4.34315 3.17157 3.17157C4.34315 2 6.23869 2 10.0298 2C10.6358 2 11.1214 2 11.53 2.01666C11.5166 2.09659 11.5095 2.17813 11.5092 2.26057L11.5 5.09497C11.4999 6.19207 11.4998 7.16164 11.6049 7.94316C11.7188 8.79028 11.9803 9.63726 12.6716 10.3285C13.3628 11.0198 14.2098 11.2813 15.0569 11.3952C15.8385 11.5003 16.808 11.5002 17.9051 11.5001L18 11.5001H21.9574C22 12.0344 22 12.6901 22 13.5629V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22ZM10.4983 14.4394C10.8079 14.7146 10.8357 15.1887 10.5606 15.4983L7.89389 18.4983C7.75156 18.6584 7.54756 18.75 7.33333 18.75C7.11911 18.75 6.9151 18.6584 6.77278 18.4983L5.43944 16.9983C5.16425 16.6887 5.19214 16.2146 5.50173 15.9394C5.81131 15.6643 6.28537 15.6921 6.56056 16.0017L7.33333 16.8711L9.43944 14.5017C9.71463 14.1921 10.1887 14.1643 10.4983 14.4394Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:home-2': [
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M2.5192 7.82274C2 8.77128 2 9.91549 2 12.2039V13.725C2 17.6258 2 19.5763 3.17157 20.7881C4.34315 22 6.22876 22 10 22H14C17.7712 22 19.6569 22 20.8284 20.7881C22 19.5763 22 17.6258 22 13.725V12.2039C22 9.91549 22 8.77128 21.4808 7.82274C20.9616 6.87421 20.0131 6.28551 18.116 5.10812L16.116 3.86687C14.1106 2.62229 13.1079 2 12 2C10.8921 2 9.88939 2.62229 7.88403 3.86687L5.88403 5.10813C3.98695 6.28551 3.0384 6.87421 2.5192 7.82274ZM11.25 18C11.25 18.4142 11.5858 18.75 12 18.75C12.4142 18.75 12.75 18.4142 12.75 18V15C12.75 14.5858 12.4142 14.25 12 14.25C11.5858 14.25 11.25 14.5858 11.25 15V18Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:layers': [
    {
      tag: 'path',
      attrs: {
        d: 'M4.97883 9.68508C2.99294 8.89073 2 8.49355 2 8C2 7.50645 2.99294 7.10927 4.97883 6.31492L7.7873 5.19153C9.77318 4.39718 10.7661 4 12 4C13.2339 4 14.2268 4.39718 16.2127 5.19153L19.0212 6.31492C21.0071 7.10927 22 7.50645 22 8C22 8.49355 21.0071 8.89073 19.0212 9.68508L16.2127 10.8085C14.2268 11.6028 13.2339 12 12 12C10.7661 12 9.77318 11.6028 7.7873 10.8085L4.97883 9.68508Z',
        fill: 'currentColor',
      },
    },
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M2 8C2 8.49355 2.99294 8.89073 4.97883 9.68508L7.7873 10.8085C9.77318 11.6028 10.7661 12 12 12C13.2339 12 14.2268 11.6028 16.2127 10.8085L19.0212 9.68508C21.0071 8.89073 22 8.49355 22 8C22 7.50645 21.0071 7.10927 19.0212 6.31492L16.2127 5.19153C14.2268 4.39718 13.2339 4 12 4C10.7661 4 9.77318 4.39718 7.7873 5.19153L4.97883 6.31492C2.99294 7.10927 2 7.50645 2 8Z',
        fill: 'currentColor',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M19.0212 13.6851L16.2127 14.8085C14.2268 15.6028 13.2339 16 12 16C10.7661 16 9.77318 15.6028 7.7873 14.8085L4.97883 13.6851C2.99294 12.8907 2 12.4935 2 12C2 11.5551 2.80681 11.1885 4.42043 10.5388L7.56143 11.7952C9.41007 12.535 10.572 13 12 13C13.428 13 14.5899 12.535 16.4386 11.7952L19.5796 10.5388C21.1932 11.1885 22 11.5551 22 12C22 12.4935 21.0071 12.8907 19.0212 13.6851Z',
        fill: 'currentColor',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M19.0212 17.6849L16.2127 18.8083C14.2268 19.6026 13.2339 19.9998 12 19.9998C10.7661 19.9998 9.77318 19.6026 7.7873 18.8083L4.97883 17.6849C2.99294 16.8905 2 16.4934 2 15.9998C2 15.5549 2.80681 15.1883 4.42043 14.5386L7.56143 15.795C9.41007 16.5348 10.572 16.9998 12 16.9998C13.428 16.9998 14.5899 16.5348 16.4386 15.795L19.5796 14.5386C21.1932 15.1883 22 15.5549 22 15.9998C22 16.4934 21.0071 16.8905 19.0212 17.6849Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:settings': [
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M14.2788 2.15224C13.9085 2 13.439 2 12.5 2C11.561 2 11.0915 2 10.7212 2.15224C10.2274 2.35523 9.83509 2.74458 9.63056 3.23463C9.53719 3.45834 9.50065 3.7185 9.48635 4.09799C9.46534 4.65568 9.17716 5.17189 8.69017 5.45093C8.20318 5.72996 7.60864 5.71954 7.11149 5.45876C6.77318 5.2813 6.52789 5.18262 6.28599 5.15102C5.75609 5.08178 5.22018 5.22429 4.79616 5.5472C4.47814 5.78938 4.24339 6.1929 3.7739 6.99993C3.30441 7.80697 3.06967 8.21048 3.01735 8.60491C2.94758 9.1308 3.09118 9.66266 3.41655 10.0835C3.56506 10.2756 3.77377 10.437 4.0977 10.639C4.57391 10.936 4.88032 11.4419 4.88029 12C4.88026 12.5581 4.57386 13.0639 4.0977 13.3608C3.77372 13.5629 3.56497 13.7244 3.41645 13.9165C3.09108 14.3373 2.94749 14.8691 3.01725 15.395C3.06957 15.7894 3.30432 16.193 3.7738 17C4.24329 17.807 4.47804 18.2106 4.79606 18.4527C5.22008 18.7756 5.75599 18.9181 6.28589 18.8489C6.52778 18.8173 6.77305 18.7186 7.11133 18.5412C7.60852 18.2804 8.2031 18.27 8.69012 18.549C9.17714 18.8281 9.46533 19.3443 9.48635 19.9021C9.50065 20.2815 9.53719 20.5417 9.63056 20.7654C9.83509 21.2554 10.2274 21.6448 10.7212 21.8478C11.0915 22 11.561 22 12.5 22C13.439 22 13.9085 22 14.2788 21.8478C14.7726 21.6448 15.1649 21.2554 15.3694 20.7654C15.4628 20.5417 15.4994 20.2815 15.5137 19.902C15.5347 19.3443 15.8228 18.8281 16.3098 18.549C16.7968 18.2699 17.3914 18.2804 17.8886 18.5412C18.2269 18.7186 18.4721 18.8172 18.714 18.8488C19.2439 18.9181 19.7798 18.7756 20.2038 18.4527C20.5219 18.2105 20.7566 17.807 21.2261 16.9999C21.6956 16.1929 21.9303 15.7894 21.9827 15.395C22.0524 14.8691 21.9088 14.3372 21.5835 13.9164C21.4349 13.7243 21.2262 13.5628 20.9022 13.3608C20.4261 13.0639 20.1197 12.558 20.1197 11.9999C20.1197 11.4418 20.4261 10.9361 20.9022 10.6392C21.2263 10.4371 21.435 10.2757 21.5836 10.0835C21.9089 9.66273 22.0525 9.13087 21.9828 8.60497C21.9304 8.21055 21.6957 7.80703 21.2262 7C20.7567 6.19297 20.522 5.78945 20.2039 5.54727C19.7799 5.22436 19.244 5.08185 18.7141 5.15109C18.4722 5.18269 18.2269 5.28136 17.8887 5.4588C17.3915 5.71959 16.7969 5.73002 16.3099 5.45096C15.8229 5.17191 15.5347 4.65566 15.5136 4.09794C15.4993 3.71848 15.4628 3.45833 15.3694 3.23463C15.1649 2.74458 14.7726 2.35523 14.2788 2.15224ZM12.5 15C14.1695 15 15.5228 13.6569 15.5228 12C15.5228 10.3431 14.1695 9 12.5 9C10.8305 9 9.47716 10.3431 9.47716 12C9.47716 13.6569 10.8305 15 12.5 15Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:shield-check': [
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M3.37752 5.08241C3 5.62028 3 7.21907 3 10.4167V11.9914C3 17.6294 7.23896 20.3655 9.89856 21.5273C10.62 21.8424 10.9807 22 12 22C13.0193 22 13.38 21.8424 14.1014 21.5273C16.761 20.3655 21 17.6294 21 11.9914V10.4167C21 7.21907 21 5.62028 20.6225 5.08241C20.245 4.54454 18.7417 4.02996 15.7351 3.00079L15.1623 2.80472C13.595 2.26824 12.8114 2 12 2C11.1886 2 10.405 2.26824 8.83772 2.80472L8.26491 3.00079C5.25832 4.02996 3.75503 4.54454 3.37752 5.08241ZM15.0595 10.4995C15.3353 10.1905 15.3085 9.71642 14.9995 9.44055C14.6905 9.16467 14.2164 9.19151 13.9405 9.50049L10.9286 12.8739L10.0595 11.9005C9.78358 11.5915 9.30947 11.5647 9.00049 11.8405C8.69151 12.1164 8.66467 12.5905 8.94055 12.8995L10.3691 14.4995C10.5114 14.6589 10.7149 14.75 10.9286 14.75C11.1422 14.75 11.3457 14.6589 11.488 14.4995L15.0595 10.4995Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:shield-warning': [
    {
      tag: 'path',
      attrs: {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167V11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914V10.4167ZM12 7.25C12.4142 7.25 12.75 7.58579 12.75 8V12C12.75 12.4142 12.4142 12.75 12 12.75C11.5858 12.75 11.25 12.4142 11.25 12V8C11.25 7.58579 11.5858 7.25 12 7.25ZM12 16C12.5523 16 13 15.5523 13 15C13 14.4477 12.5523 14 12 14C11.4477 14 11 14.4477 11 15C11 15.5523 11.4477 16 12 16Z',
        fill: 'currentColor',
      },
    },
  ],
  'Bold:user': [
    {
      tag: 'path',
      attrs: {
        d: 'M12 13C16.4183 13 20 15.0147 20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13Z',
        fill: 'currentColor',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 2C14.2091 2 16 3.79086 16 6C16 8.20914 14.2091 10 12 10C9.79086 10 8 8.20914 8 6C8 3.79086 9.79086 2 12 2Z',
        fill: 'currentColor',
      },
    },
  ],
};
export const solarNames: Record<string, string> = {
  Activity: 'pulse',
  AlertCircle: 'danger-circle',
  AlertTriangle: 'danger-triangle',
  ArrowDownRight: 'arrow-right-down',
  ArrowLeft: 'arrow-left',
  ArrowRight: 'arrow-right',
  ArrowUpRight: 'arrow-right-up',
  BarChart3: 'chart',
  Bed: 'bed',
  BedDouble: 'bed',
  Bell: 'bell',
  Building: 'buildings',
  Building2: 'hospital',
  Calculator: 'calculator',
  Calendar: 'calendar',
  Camera: 'camera',
  Check: 'check',
  CheckCheck: 'check-read',
  CheckCircle2: 'check-circle',
  ChevronDown: 'alt-arrow-down',
  ChevronLeft: 'alt-arrow-left',
  ChevronRight: 'alt-arrow-right',
  ChevronUp: 'alt-arrow-up',
  CircleCheck: 'check-circle',
  Clock: 'clock-circle',
  Columns: 'table-columns-split',
  Copy: 'copy',
  CornerDownLeft: 'undo-left',
  Cpu: 'cpu',
  CreditCard: 'card',
  DollarSign: 'dollar',
  DoorOpen: 'exit',
  Download: 'download',
  ExternalLink: 'square-top-down',
  Eye: 'eye',
  EyeOff: 'eye-closed',
  FileCheck: 'file-check',
  FileCheck2: 'file-check',
  FileSignature: 'file-pen',
  FileText: 'document-text',
  Filter: 'filter',
  Hash: 'hashtag',
  HelpCircle: 'question-circle',
  Home: 'home-2',
  Info: 'info-circle',
  Kanban: 'kanban',
  Layers: 'layers',
  List: 'list',
  Loader2: 'refresh',
  Lock: 'lock',
  LockKeyhole: 'lock-keyhole',
  LogOut: 'logout',
  Mail: 'letter',
  MessageSquare: 'chat-square',
  Mic: 'microphone',
  MoreHorizontal: 'menu-dots',
  PanelLeftClose: 'panel-left-close',
  PanelLeftOpen: 'panel-left-open',
  Pencil: 'pen',
  Phone: 'phone',
  Pill: 'pill',
  Plus: 'add',
  Printer: 'printer',
  QrCode: 'qr-code',
  Receipt: 'bill',
  RefreshCw: 'refresh',
  RotateCcw: 'restart',
  Scale: 'book-bookmark',
  Search: 'magnifier',
  SearchX: 'magnifier-close',
  Send: 'plane',
  Settings: 'settings',
  Shield: 'shield',
  ShieldAlert: 'shield-warning',
  ShieldCheck: 'shield-check',
  Smartphone: 'smartphone',
  Sparkles: 'stars',
  Stethoscope: 'stethoscope',
  Table: 'table',
  Tag: 'tag',
  Trash2: 'trash-bin-trash',
  TrendingDown: 'graph-down',
  TrendingUp: 'graph-up',
  TriangleAlert: 'danger-triangle',
  Upload: 'upload',
  User: 'user',
  UserCheck: 'user-check',
  UserPlus: 'user-plus',
  UserRoundCog: 'user-id',
  Users: 'users-group-rounded',
  X: 'close',
  XCircle: 'close-circle',
  Zap: 'bolt',
};
