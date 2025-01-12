'use client'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'

const defaultCenter =
	// Saint Malo [-1.9890417068124002, 48.66284934737089]
	[-1.6776317608896583, 48.10983044383964]

const defaultState = {
	depuis: { inputValue: '', choice: false },
	vers: { inputValue: '', choice: false },
	validated: false,
}
const defaultZoom = 8

const styleKeys = {
	streets: '2f80a9c4-e0dd-437d-ae35-2b6c212f830b',
	satellite: 'satellite',
	toner: 'toner-v2',
}
export default function Map({ searchParams }) {
	const [mapState, setMapState] = useState({ zoom: defaultZoom })
	const [style, setStyle] = useState('toner')
	const [features, setFeatures] = useState([])
	const styleKey = styleKeys[style]
	const [go, setGo] = useState(null)

	if (process.env.NEXT_PUBLIC_MAPTILER == null) {
		throw new Error('You have to configure env REACT_APP_API_KEY, see README')
	}

	const mapContainerRef = useRef()

	const [map, setMap] = useState(null)

	useEffect(() => {
		if (!map || go !== 'user click') return

		const fetchCategories = async () => {
			const mapLibreBbox = map.getBounds().toArray(),
				bbox = [
					mapLibreBbox[0][1],
					mapLibreBbox[0][0],
					mapLibreBbox[1][1],
					mapLibreBbox[1][0],
				].join(',')

			const overpassRequest = `
[out:json];
(
way["highway"="secondary"][maxspeed](${bbox});
);

out body;
>;
out skel qt;

`
			const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
				overpassRequest
			)}`
			console.log(url)
			setGo('overpass request sent')
			const request = await fetch(url)
			setGo('overpass request received, will process')
			const json = await request.json()
			const ways = json.elements.map((el) => {
				if (!el.type === 'way' || !el.nodes) return false

				const coordinates = el.nodes
					.map((id) =>
						json.elements.find((el2) => el2.type === 'node' && el2.id === id)
					)
					.filter(Boolean)
					.map(({ lat, lon }) => [lon, lat])
				const maxspeed = el.tags.maxspeed
				return {
					type: 'Feature',
					properties: {
						color:
							maxspeed == undefined
								? 'grey'
								: +maxspeed > 80
								? 'red'
								: +maxspeed === 80
								? 'blue'
								: +maxspeed < 80
								? 'green'
								: 'grey',
					},
					geometry: {
						coordinates,
						type: 'LineString',
					},
				}
			})

			const geojson = {
				type: 'FeatureCollection',
				features: ways,
			}

			console.log('Rlala', geojson)
			setGo('features processed')
			setFeatures(geojson)
		}
		fetchCategories()
	}, [map, go])

	useEffect(() => {
		if (!map || features.length < 1) return

		map.addSource('features-ways', {
			type: 'geojson',
			data: features,
		})

		map.addLayer({
			id: 'features-ways',
			type: 'line',
			source: 'features-ways',
			layout: {
				'line-join': 'round',
				'line-cap': 'round',
			},
			paint: {
				'line-color': ['get', 'color'],
				'line-width': 4,
			},
		})

		return () => {
			map.removeLayer('features-ways')
			map.removeSource('features-ways')
		}
	}, [features, map])

	useEffect(() => {
		const newMap = new maplibregl.Map({
			container: mapContainerRef.current,
			style: `https://api.maptiler.com/maps/${styleKey}/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER}`,
			center: defaultCenter,
			zoom: defaultZoom,
			hash: true,
		})
		setMap(newMap)

		newMap.addControl(new maplibregl.NavigationControl(), 'top-right')
		newMap.addControl(
			new maplibregl.GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true,
				},
				trackUserLocation: true,
			})
		)

		setMapState({ zoom: newMap.getZoom() })
		newMap.on('zoom', () => {
			setMapState({ zoom: newMap.getZoom() })
		})

		//new maplibregl.Marker({ color: '#FF0000' }).setLngLat(defaultCenter).addTo(newMap)

		return () => {
			newMap.remove()
		}
	}, [setMap, mapContainerRef])

	useEffect(() => {
		if (!map) return

		map.setStyle(
			`https://api.maptiler.com/maps/${styleKey}/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER}`
		)
	}, [styleKey, map])

	return (
		<div
			css={`
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: #faf5e4;
				> div:last-child {
					position: absolute;
					width: 100%;
					height: 100%;
				}
				> a {
					position: absolute;
					left: 10px;
					bottom: 10px;
					z-index: 999;
				}
				color: var(--darkestColor);
			`}
		>
			<div
				css={`
					position: absolute;
					top: min(2vh, 0.5rem);
					left: min(4vw, 2rem);
					z-index: 10;
					h1 {
						color: ${style === 'satellite' ? 'white' : 'var(--darkerColor)'};
						border-bottom: 5px solid var(--color);
						display: inline-block;
						padding: 0;
						line-height: 1.8rem;
						margin-top: 1rem;
						@media (max-width: 800px) {
							margin: 0;
							margin-bottom: 0.4rem;
							font-size: 120%;
							border-bottom-width: 2px;
							line-height: 1.2rem;
						}
					}
				`}
			>
				<button onClick={() => setGo('user click')}>
					Lancer la requête sur cette zone ATTENTION FAIRE DES PETITES ZONES DE
					MOINS DE 100 KM POUR L'INSTANT
				</button>
				<div
					css={`
						background: 'red';
						color: black;
					`}
				>
					{go}
				</div>
			</div>
			<button
				css={`
					position: fixed;
					bottom: 0.4rem;
					left: 0.4rem;
					width: 4.5rem;
					height: 4rem;
					text-align: center;
					border-radius: 0.4rem;
					z-index: 1;
					border: 4px solid white;
					padding: 0;
					background: white;
					opacity: 0.8;
					img {
						width: 1.5rem;
						height: auto;
					}
					border: 2px solid var(--lighterColor);
				`}
				onClick={() => setStyle(style === 'streets' ? 'satellite' : 'streets')}
			>
				{style === 'streets' ? (
					<div>
						🛰️
						<div>Satellite</div>
					</div>
				) : (
					<div>
						🗺️
						<div>Carte</div>
					</div>
				)}
			</button>
			<div ref={mapContainerRef} />
		</div>
	)
}
