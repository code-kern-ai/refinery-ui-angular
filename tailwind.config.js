const colors = require("tailwindcss/colors");
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  prefix: "",
  purge: {
    enabled: true,
    mode: "all",
    content: ["./src/**/*.{html,ts}"],
    safelist: [
      /data-theme$/,
      "hljs",
      "hljs-comment",
      "hljs-quote",
      "hljs-keyword",
      "hljs-selector-tag",
      "hljs-subst",
      "hljs-number",
      "hljs-literal",
      "hljs-variable",
      "hljs-template-variable",
      "hljs-tag",
      "hljs-attr",
      "hljs-string",
      "hljs-doctag",
      "hljs-title",
      "hljs-section",
      "hljs-selector-id",
      "hljs-subst",
      "hljs-type",
      "hljs-class",
      "hljs-name",
      "hljs-attribute",
      "hljs-regexp",
      "hljs-link",
      "hljs-symbol",
      "hljs-bullet",
      "hljs-built_in",
      "hljs-builtin-name",
      "hljs-meta",
      "hljs-deletion",
      "hljs-addition",
      "hljs-emphasis",
      "hljs-strong",
      // /(from|via|to|border|bg|text)-(.*)-(\d{1}0{1,2})/, // all color options
      // /(border|bg|text)-(.*)-(100|200|400|700)/, colors with specific value & type
      // /(border|bg|text)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(100|200|400|700)/,
      /(bg)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(100|200)/,
      /(border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(400)/,
      /(text)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(700)/,
      /(text)-(red|yellow|green|blue)-(800)/,
    ],
    options: {
      keyframes: true,
    },
  },
  darkMode: "class", // or 'media' or 'class'
  theme: {
    colors: {
      // Build your palette here
      transparent: "transparent",
      current: "currentColor",
      black: colors.black,
      white: colors.white,
      gray: colors.gray,

      red: colors.red,
      orange: colors.orange,
      amber: colors.amber,
      yellow: colors.yellow,
      lime: colors.lime,
      green: colors.green,
      emerald: colors.emerald,
      teal: colors.teal,
      cyan: colors.cyan,
      sky: colors.sky,
      blue: colors.blue,
      indigo: colors.indigo,
      violet: colors.violet,
      purple: colors.purple,
      fuchsia: colors.fuchsia,
      pink: colors.pink,
      rose: colors.rose,
      kerngreen: {
        DEFAULT: "#7BED8D"
      },
      kernindigo: {
        DEFAULT: "#0C052E",
        dark: "#06023b",
        darker: "#4F46E5",
        "darker-1": "#312E81",
        light: "#EEF2FF",
        "dark-1": "#0000F5",
        "dark-2": "#4338CA"
      },
    },
    maxHeight: {
      0: "0",
      "1/4": "25%",
      "1/3": "33%",
      "1/2-": "45%",
      "1/2": "50%",
      "3/4-": "70%",
      "3/4": "75%",
      "4/5": "80%",
      "4/5+": "85%",
      "9/10": "90%",
      "9/10+": "95%",
      full: "100%",
      s: "12.5rem",
      m: "25rem",
    },
    maxWidth: {
      "xxs": "9rem",
      "xs-1": "250px",
      ...defaultTheme.maxWidth,
      "4/5": "80%"
    },
    minWidth: {
      "1/2": "50%"
    },
    lineHeight: {
      '12': '3rem',
    },
    fontFamily: {
      dmSans: ["DM Sans", "sans-serif"],
      dmMono: ["DM Mono", "sans-serif"]
    },
    extend: {
      fontFamily: {
        sans: ["DM Sans"],
      },
      gridTemplateColumns: {
        '1-max': 'max-content',
        '2-max': 'max-content max-content',
        '4-max': 'max-content max-content max-content max-content',
      }
    },
    screens: {
      "xs": "450px",
      ...defaultTheme.screens,
    }
  },
  variants: {
    margin: ["responsive", "hover", "first", "last"],
    extend: {},
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/line-clamp"),
    require("daisyui"),
  ],
  daisyui: {
    themes: [
      {
        kern: {
          primary: "#7BED8D",
          "primary-focus": "#82FA94",
          "primary-content": "#ffffff",
          secondary: "#ED7B96",
          "secondary-focus": "#FA829E",
          "secondary-content": "#ffffff",
          accent: "#37cdbe",
          "accent-focus": "#2aa79b",
          "accent-content": "#ffffff",
          neutral: "#3d4451",
          "neutral-focus": "#2a2e37",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f9fafb",
          "base-300": "#d1d5db",
          "base-content": "#1f2937",
          info: "#2094f3",
          success: "#009485",
          warning: "#ff9900",
          error: "#ff5724",
        },
      },
    ],
  },
};
