/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		/* Dos radios, no uno para todo (identidad-visual §2).
  		   `sharp` para inputs, celdas y chips de datos; `--radius` (10px) para
  		   cards y modales. `xl`/`2xl` se remapean al radio suave a propósito:
  		   son 214 usos heredados y así entran en el sistema sin tocar 214
  		   archivos. Si necesitas una esquina viva, usa `rounded-sharp`. */
  		borderRadius: {
  			sharp: 'var(--radius-sharp)',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'var(--radius)',
  			'2xl': 'var(--radius)'
  		},
  		fontFamily: {
  			/* Display: sólo titulares de sección y hero. Uso restringido. */
  			display: ['Archivo', 'system-ui', 'sans-serif'],
  			sans: ['Inter Tight', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  			/* Datos: todo número (precios, lotes, %, R:R, griegas). */
  			mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
  		},
  		/* Curvas propias (microinteracciones §2). `out` sustituye a propósito
  		   al `ease-out` de Tailwind: los usos que ya existen heredan la curva
  		   buena sin editarlos. */
  		transitionTimingFunction: {
  			out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  			inout: 'cubic-bezier(0.65, 0, 0.35, 1)',
  			snap: 'cubic-bezier(0.34, 1.4, 0.64, 1)'
  		},
  		transitionDuration: {
  			tick: '90ms',
  			beat: '180ms',
  			swing: '320ms',
  			arc: '520ms'
  		},
  		colors: {
  			/* P&L. Reservados: no usar para marca, links ni iconos decorativos. */
  			long: 'hsl(var(--long))',
  			short: 'hsl(var(--short))',
  			/* Filete de 1px: el separador principal, en vez de sombra. */
  			rule: 'hsl(var(--rule))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};