// Injected into every dashboard page during capture: a visible macOS-style cursor with a click ripple.
// The capture script moves it with window.__filmCursor.move(x, y) and window.__filmCursor.press().
(() => {
  if (window.__filmCursor) return;
  const mount = () => {
    const style = document.createElement('style');
    style.textContent = `
      #film-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
        transform:translate(720px,450px);transition:transform 520ms cubic-bezier(.65,0,.35,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
      #film-cursor svg{transition:transform 90ms ease-out;transform-origin:4px 3px}
      #film-cursor.down svg{transform:scale(.88)}
      .film-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;z-index:2147483646;pointer-events:none;
        border:2px solid #11806D;background:rgba(17,128,109,.18);animation:film-ripple 520ms ease-out forwards}
      @keyframes film-ripple{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}`;
    document.head.appendChild(style);
    const el = document.createElement('div');
    el.id = 'film-cursor';
    el.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M4 3 L4 21 L9 16.5 L12.5 24 L15.5 22.6 L12 15.3 L19 15.3 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(el);
    let pos = { x: 720, y: 450 };
    window.__filmCursor = {
      move(x, y, ms = 520) {
        el.style.transitionDuration = ms + 'ms';
        el.style.transform = `translate(${x - 4}px,${y - 3}px)`;
        pos = { x, y };
      },
      press() {
        el.classList.add('down');
        setTimeout(() => el.classList.remove('down'), 140);
        const r = document.createElement('div');
        r.className = 'film-ripple';
        r.style.left = pos.x + 'px';
        r.style.top = pos.y + 'px';
        document.body.appendChild(r);
        setTimeout(() => r.remove(), 600);
      },
    };
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
