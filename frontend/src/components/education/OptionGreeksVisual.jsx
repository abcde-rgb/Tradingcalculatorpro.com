import React from 'react';
import { C, Curva, Ejes, Frame, Line, Marca, T, Zona } from './figuras';

/**
 * Las griegas, dibujadas. Una figura por apartado de `getOptionGreeks`.
 *
 * Este módulo era el hueco más grave de toda la academia: `option-greeks` son
 * los cimientos del pilar de opciones y no tenía ni un dibujo, mientras que los
 * tres módulos construidos ENCIMA —gamma-exposure, options-vol,
 * options-income— tenían cada uno su componente. Y las griegas son curvas:
 * «gamma es la tasa de cambio de delta» en prosa es la peor forma posible de
 * explicarlo, porque lo que hay que ver es dónde está el pico.
 *
 * Las etiquetas son símbolos (Δ Γ Θ ν ρ K) y no palabras, a propósito: la
 * academia se sirve en diez idiomas y los componentes existentes hornean
 * español dentro del SVG. Un símbolo no necesita traducción y no puede quedarse
 * desfasado.
 *
 * Las formas son las de Black-Scholes para una CALL, cualitativamente:
 *   · delta  sigmoide de 0 a 1, con 0,5 en el dinero
 *   · gamma  campana centrada en el strike
 *   · theta  decaimiento acelerado, no lineal — por eso van dos curvas
 *   · vega   campana centrada en el strike, que se aplana al vencer
 *   · rho    casi plano: dibujar lo irrelevante también enseña
 *   · iv     la sonrisa
 */

const K = 124;  // el strike, en coordenadas del viewBox

// Eje horizontal = precio del subyacente. Se repite en cinco figuras.
const EjeSubyacente = () => (
  <>
    <Ejes />
    <Marca x={K} />
    <T x={K} y={108} textAnchor="middle" fill={C.hot}>K</T>
  </>
);

const VISUALS = {
  // ── Delta: sigmoide 0 → 1, valor 0,5 justo en el strike ──────────────
  delta: (
    <Frame label="delta: sigmoide de 0 a 1 con 0,5 en el strike">
      <EjeSubyacente />
      <Line pts={`20,90 ${K},90`} c={C.mut} w={1} dash="2 3" />
      <Curva d={`M24 90 C 78 90, 106 74, ${K} 56 C 142 38, 170 22, 228 22`} c={C.neut} />
      <circle cx={K} cy={56} r="2.6" fill={C.hot} />
      <T x={26} y={86} fill={C.mut}>0</T>
      <T x={26} y={28} fill={C.mut}>1</T>
      <T x={K + 6} y={52} fill={C.hot}>0,5</T>
      <T x={196} y={92} fill={C.mut}>Δ</T>
    </Frame>
  ),

  // ── Gamma: campana con el pico EN el strike ──────────────────────────
  gamma: (
    <Frame label="gamma: campana con el pico en el strike">
      <EjeSubyacente />
      <Curva d={`M24 94 C 78 94, 104 26, ${K} 26 C 144 26, 170 94, 228 94`}
             c={C.up} fill="none" />
      <circle cx={K} cy={26} r="2.6" fill={C.hot} />
      <T x={K} y={17} textAnchor="middle" fill={C.up}>Γ máx</T>
      <T x={196} y={92} fill={C.mut}>Γ</T>
    </Frame>
  ),

  // ── Theta: el decaimiento NO es lineal, y por eso van dos curvas ─────
  theta: (
    <Frame label="theta: el valor temporal cae más rápido cerca del vencimiento">
      <Ejes />
      {/* La recta que mucha gente imagina, para contrastar con la real. */}
      <Line pts="24,20 224,94" c={C.mut} w={1} dash="3 3" />
      <Curva d="M24 20 C 96 30, 150 44, 190 66 C 208 78, 218 88, 224 94" c={C.down} />
      <Marca x={224} y1={12} y2={96} c={C.hot} />
      <T x={218} y={108} textAnchor="end" fill={C.hot}>0 d</T>
      <T x={26} y={108} fill={C.mut}>90 d</T>
      <T x={60} y={40} fill={C.down}>Θ</T>
    </Frame>
  ),

  // ── Vega: campana que se APLANA al acercarse el vencimiento ──────────
  vega: (
    <Frame label="vega: campana que se aplana al acercarse el vencimiento">
      <EjeSubyacente />
      <Curva d={`M24 94 C 74 94, 100 30, ${K} 30 C 148 30, 174 94, 228 94`} c={C.neut} />
      <Curva d={`M24 94 C 84 94, 108 68, ${K} 68 C 140 68, 164 94, 228 94`}
             c={C.mut} w={1.4} dash="3 3" />
      <T x={K} y={24} textAnchor="middle" fill={C.neut}>ν  90 d</T>
      <T x={172} y={64} fill={C.mut}>ν  7 d</T>
    </Frame>
  ),

  // ── Rho: plano y pequeño. Dibujar lo irrelevante también enseña ──────
  rho: (
    <Frame label="rho: casi plano frente a las demás griegas">
      <EjeSubyacente />
      <Curva d={`M24 94 C 78 94, 104 26, ${K} 26 C 144 26, 170 94, 228 94`}
             c={C.mut} w={1.2} dash="3 3" />
      <Line pts="24,80 228,72" c={C.neut} />
      <T x={30} y={70} fill={C.neut}>ρ</T>
      <T x={K} y={20} textAnchor="middle" fill={C.mut}>Γ</T>
    </Frame>
  ),

  // ── IV: la sonrisa ───────────────────────────────────────────────────
  iv: (
    <Frame label="volatilidad implícita: la sonrisa">
      <EjeSubyacente />
      <Curva d={`M24 34 C 70 78, 100 90, ${K} 90 C 148 90, 180 60, 228 40`} c={C.hot} />
      <Zona x={20} y={12} w={44} h={84} c={C.down} o={0.08} />
      <Zona x={184} y={12} w={44} h={84} c={C.down} o={0.08} />
      <T x={30} y={26} fill={C.down}>IV ↑</T>
      <T x={222} y={32} textAnchor="end" fill={C.down}>IV ↑</T>
      <T x={K + 26} y={86} fill={C.mut}>IV mín</T>
    </Frame>
  ),
};

export default function OptionGreeksVisual({ id }) {
  const fig = VISUALS[id];
  if (!fig) return null;
  return (
    <div className="mt-3" data-testid={`greek-fig-${id}`}>
      {fig}
    </div>
  );
}
