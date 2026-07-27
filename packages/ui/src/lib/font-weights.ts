// Весовые токены для `font-variation-settings` (variable-шрифт, напр. Geist).
//
// Каждый вес сопряжён с оптическим размером (`opsz`), чтобы анимация между
// весами держала advance-width почти постоянным: тяжелее `wght` расширяет текст,
// а tighter (больший) `opsz` возвращает обратно. opsz намеренно перекрывает
// `font-optical-sizing: auto` — мы хотим, чтобы вес, а не кегль, управлял оптикой.
export const fontWeights = {
	normal: "'wght' 400, 'opsz' 14",
	medium: "'wght' 450, 'opsz' 15",
	semibold: "'wght' 550, 'opsz' 20",
	bold: "'wght' 700, 'opsz' 25",
} as const;
