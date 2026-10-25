export const THEME_STORAGE_KEY = "bowlboard-theme";

/*
 * Runs before first paint (put <ThemeScript /> in <head> of the root layout):
 * resolves stored choice ("light" | "dark") or the system preference, sets the
 * `.dark` class and color-scheme on <html>, and follows system changes while
 * no explicit choice is stored. Needs suppressHydrationWarning on <html>.
 */
const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var t=null;try{t=localStorage.getItem(k)}catch(e){}var d=t==="dark"||(t!=="light"&&m.matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}a();m.addEventListener("change",a)}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
