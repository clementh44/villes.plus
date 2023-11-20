import Link from 'next/link'
import { Cards, LandingWrapper, Header, Card, LinkCard } from './UI'
import type { Metadata } from 'next'
import Image from 'next/image'
import logo from '@/public/logo.svg'
import Carte from './cartes/Carte'

export const metadata: Metadata = {
	title:
		'Le classement des villes les plus cyclables et piétonnes - villes.plus',
	description: `Une ville ne peut être agréable si elle est hostile aux piétons et aux vélos (ainsi qu'à toutes les mobilités légères). Nous évaluons, avec une méthodologie complètement transparente, une note de cyclabilité et de surface piétonne pour chaque ville et métropole française.`,
}

export default () => (
	<LandingWrapper>
		<Header>
			<Image src={logo} alt="Logo de villes.plus" />
			<h1>Villes.plus</h1>
		</Header>
		<Cards>
			<LinkCard>
				<Link href="/cyclables/regions">
					<Carte level="régions" />
					<div>
						Les <strong>régions</strong> les plus cyclables.
					</div>
				</Link>
			</LinkCard>
			<LinkCard>
				<Link href="/cyclables/departements">
					<Carte level="départements" />
					<div>
						Les <strong>départements</strong> les plus cyclables.
					</div>
				</Link>
			</LinkCard>
		</Cards>
		<Cards>
			<LinkCard>
				<Link href="/cyclables/metropoles">
					<span>🚲️</span> Le classement des <strong>métropoles</strong> les
					plus cyclables.
				</Link>
			</LinkCard>
			<LinkCard>
				<Link href="/cyclables/grandes-villes">
					<span>🚲️</span> Le classement des <strong>grandes villes</strong> les
					plus cyclables.
				</Link>
			</LinkCard>
			<LinkCard>
				<Link href="/cyclables/prefectures">
					<span>🚲️</span> Le classement des <strong>préfectures</strong> les
					plus cyclables.
				</Link>
			</LinkCard>
			<LinkCard>
				<Link href="/cyclables/communes">
					<span>🚲️</span> Le classement des <strong>villes moyennes</strong>{' '}
					les plus cyclables.
				</Link>
			</LinkCard>
		</Cards>
		<Cards>
			<LinkCard>
				<Link href="/pietonnes">
					<span>🚶</span>
					Le classement des grandes villes <strong>les plus piétonnes</strong>
				</Link>
			</LinkCard>
		</Cards>
	</LandingWrapper>
)
