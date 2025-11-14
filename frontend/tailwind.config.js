module.exports = {
  content: [
    "./src/pages/**/*.html",
    "./src/css/**/*.css",
    "./src/js/**/*.js"
  ],
  theme: {
    extend: {
      spacing: {
        '30': '7.5rem',
        '2.2': '0.65rem',
        '20': '4rem',
        '78': '19.5rem'
      },
      width: {
        '78': '19.5rem'
      },     
      colors: {
        'dark-bg': '#1e1e1e', 
        'luma-black': '#1e1e1e'    
      }
    },
    fontFamily: {
      sans: ["'Poppins'", 'ui-sans-serif', 'system-ui', '-apple-system', "'Segoe UI'", 'Roboto', "'Helvetica Neue'", 'Arial', 'Noto Sans']
    }
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.container-lg': {
          width: '64%',
          marginLeft: 'auto',
          marginRight: 'auto',
        }
      })
    }]
};