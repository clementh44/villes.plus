import tinygradient from 'tinygradient'
import { previousDate } from '@/../algorithmVersion'
import { Wrapper } from './CyclableScoreVignetteUI'
/*
	Hex to RGB conversion:
 	http://www.javascripter.net/faq/hextorgb.htm
*/
const cutHex = (h: string) => (h.startsWith('#') ? h.substring(1, 7) : h),
	hexToR = (h: string) => parseInt(cutHex(h).substring(0, 2), 16),
	hexToG = (h: string) => parseInt(cutHex(h).substring(2, 4), 16),
	hexToB = (h: string) => parseInt(cutHex(h).substring(4, 6), 16)

/*
	Given a background color, should you write on it in black or white ?
   	Taken from http://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color#comment61936401_3943023
*/
export function findContrastedTextColor(color: string, simple: boolean) {
	const { r, g, b } = color._originalInput

	if (simple) {
		// The YIQ formula
		return r * 0.299 + g * 0.587 + b * 0.114 > 128 ? '#000000' : '#ffffff'
	} // else complex formula
	const uicolors = [r / 255, g / 255, b / 255],
		c = uicolors.map((c) =>
			c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
		),
		L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

	return L > 0.179 ? '#000000' : '#ffffff'
}

const gradient = tinygradient(
	['#78e08f', '#e1d738', '#f6b93b', '#b71540', '#000000'].reverse()
)

export const colors = gradient.rgb(20)

export const getBackgroundColor = (score) => colors[Math.round(score / 5)]

export default ({ data, margin = '' }) => {
	const score = data.score
	if (!score) return null
	const roundScore = Math.round(score),
		note = roundScore / 10,
		noteDigit = Math.floor(note),
		noteDecimalDigit = Math.round((note - noteDigit) * 10)
	const background = getBackgroundColor(score),
		color = findContrastedTextColor(background, false)

	return (
		<Wrapper>
			<div
				title={`${score.toFixed(2)} % des km testés sont cyclables`}
				css={`
					text-align: center;
					margin: 0 2vw;
					${margin && `margin: ${margin} !important;`}
					@media (min-width: 800px) {
						font-size: 260%;
						margin: 0 6rem 0 2rem;
					}

					display: flex;
					flex-direction: column;
					justify-content: center;
					background: ${background};
					color: ${color};
					border: 3px solid black;
					border-radius: 0.2rem;
					padding: 0.4rem 1rem;
					width: 5.5rem;
					font-size: 250%;
					small {
						font-size: 50%;
					}
					@media (max-width: 800px) {
						font-size: 120%;
						width: 3.5rem;
					}
				`}
			>
				<div>
					<strong>{noteDigit}</strong>
					{noteDecimalDigit !== 0 && <small>,{noteDecimalDigit}</small>}
				</div>
				<span
					css={`
						font-size: 60%;
					`}
				>
					/10
				</span>
			</div>
			{data.previousData && <Evolution data={data} />}
		</Wrapper>
	)
}

const Evolution = ({ data }) => {
	const previous = data.previousData?.score
	if (!previous) return null
	const diff = (data.score - previous) / 10, // No use comparing %, the random of the algorithm makes variability a feature
		rounded = roundHalf(diff),
		prefix = rounded >= 0 ? '+ ' : '',
		text = prefix + rounded

	const legend = `Le nouveau score mensuel est de ${Math.round(
		data.score
	)} % versus l'ancien de ${Math.round(
		previous
	)} % pour le mois de ${previousDate}`
	return <small title={legend}>{text} pt</small>
}
const roundHalf = function (n) {
	return +(Math.round(n * 2) / 2).toFixed(1)
}
