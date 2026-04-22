import van from "./van-1.6.0.min.js";

const { a, div, h1, p, input, button, span, code } = van.tags;

function parseGuid(raw) {
  const s = raw.trim();
  const patterns = [
    /^([0-9a-f]{32})$/i,                                                             // N
    /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i,     // D
    /^\{([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\}$/i, // B
    /^\(([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\)$/i, // P
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      return m.slice(1).join("").toLowerCase();
    }
  }
  return null;
}

function formatGuid(hex, fmt) {
  const p = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ];
  switch (fmt) {
    case "N": return hex;
    case "D": return p.join("-");
    case "B": return `{${p.join("-")}}`;
    case "P": return `(${p.join("-")})`;
  }
}

function detectVersion(hex) {
  const nibble = parseInt(hex[12], 16);
  const labels = {
    1: "Version 1 (timestamp + MAC)",
    2: "Version 2 (DCE security)",
    3: "Version 3 (MD5 hash)",
    4: "Version 4 (random)",
    5: "Version 5 (SHA-1 hash)",
    6: "Version 6 (sortable timestamp)",
    7: "Version 7 (Unix epoch timestamp)",
    8: "Version 8 (custom)",
  };
  return { version: nibble, label: labels[nibble] || "Unknown version" };
}

function detectVariant(hex) {
  const byte8 = parseInt(hex.slice(16, 18), 16);
  if ((byte8 & 0x80) === 0) return "NCS";
  if ((byte8 & 0xc0) === 0x80)
    return hex === "8be4df6193ca11d2aa0d00e098032b8c"
      ? "RFC 9562, copied from Wikipedia \uD83D\uDCD6"
      : "RFC 9562";
  if ((byte8 & 0xe0) === 0xc0) return "Microsoft";
  return "Reserved";
}

function generateRandomGuid() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 9562
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

let activeCopy = van.state(null);
let activeCopyTimer = 0;

function FormatRow(label, formatKey, upper, parsedHex) {
  const id = label;
  const formatted = van.derive(() => {
    const hex = parsedHex.val;
    if (!hex) return "";
    const result = formatGuid(hex, formatKey);
    return upper ? result.toUpperCase() : result;
  });

  const onCopy = () => {
    navigator.clipboard.writeText(formatted.val).then(() => {
      clearTimeout(activeCopyTimer);
      activeCopy.val = id;
      activeCopyTimer = setTimeout(() => (activeCopy.val = null), 1500);
    });
  };

  return div(
    { class: "format-row" },
    span({ class: "format-label" }, label),
    code({
      class: "format-value",
      onclick: (e) => {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(e.currentTarget);
        sel.removeAllRanges();
        sel.addRange(range);
      },
    }, () => formatted.val),
    button(
      {
        class: () => "copy-btn" + (activeCopy.val === id ? " copied" : ""),
        disabled: () => !parsedHex.val,
        onclick: onCopy,
      },
      span({ "aria-live": "polite" }, () => (activeCopy.val === id ? "Copied!" : "Copy")),
    ),
  );
}

function OutputSection(parsedHex) {
  return div(
    () => {
      const hex = parsedHex.val;
      if (!hex)
        return div({ class: "version-info" }, div(span("Version: "), "\uD83E\uDD37"), div(span("Variant: "), "\uD83E\uDD37"));
      const nil = hex === "00000000000000000000000000000000";
      const max = hex === "ffffffffffffffffffffffffffffffff";
      if (nil || max)
        return div(
          { class: "version-info" },
          div(span("Version: "), nil ? "Nil UUID" : "Max UUID"),
          div(span("Variant: "), nil ? "Nothing really matters" : "Take what you can, give nothing back!"),
        );
      const ver = detectVersion(hex);
      const variant = detectVariant(hex);
      return div(
        { class: "version-info" },
        div(span("Version: "), ver.label),
        div(span("Variant: "), variant),
      );
    },
    div(
      { class: "formats-section" },
      FormatRow("N", "N", false, parsedHex),
      FormatRow("N\u2191", "N", true, parsedHex),
      FormatRow("D", "D", false, parsedHex),
      FormatRow("D\u2191", "D", true, parsedHex),
      FormatRow("B", "B", false, parsedHex),
      FormatRow("B\u2191", "B", true, parsedHex),
      FormatRow("P", "P", false, parsedHex),
      FormatRow("P\u2191", "P", true, parsedHex),
    ),
  );
}

function InputSection(inputText, parsedHex) {
  const showError = van.derive(
    () => inputText.val.trim() !== "" && parsedHex.val === null,
  );

  const onGenerate = () => {
    inputText.val = formatGuid(generateRandomGuid(), "D");
  };

  return div(
    p(
      { class: "error-msg" },
      () => (showError.val ? "Not a valid GUID format" : "\u00a0"),
    ),
    div(
      { class: "input-row" },
      input({
        type: "text",
        placeholder: "00000000-0000-0000-0000-000000000000",
        autofocus: true,
        spellcheck: false,
        class: () => (showError.val ? "invalid" : ""),
        value: () => inputText.val,
        oninput: (e) => (inputText.val = e.target.value),
      }),
      button({ onclick: onGenerate }, "Generate"),
    ),
  );
}

function App() {
  const inputText = van.state("");
  const parsedHex = van.derive(() => parseGuid(inputText.val));

  return div(
    h1("GUID Format Converter"),
    InputSection(inputText, parsedHex),
    OutputSection(parsedHex),
    p(
      { class: "source-link" },
      a(
        { href: "https://github.com/sebastianlay/Guidizer" },
        "source code"
      )
    ),
  );
}

van.add(document.getElementById("app"), App());
