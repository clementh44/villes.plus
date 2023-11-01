import { polygon } from '@flatten-js/core'
import area from '@turf/area'
import buffer from '@turf/buffer'
import geojsonLength from 'geojson-length'
import mapshaper from 'mapshaper'
import osmtogeojson from 'osmtogeojson'
import makeRequest from './request.js'

const countTypes = (features) =>
	features.reduce((memo, next) => {
		const t = next.geometry.type
		memo[t] = (memo[t] || 0) + 1
		return memo
	}, {})

const score = (geoJson) => {
	const areas = geoJson.features
		.filter((f) => f.geometry.type === 'Polygon')
		.map((f) => geojsonArea.geometry(f.geometry))

	const areasLength = areas.length
	const totalAreas = areas.reduce((memo, next) => memo + next, 0)
	const lines = geoJson.features
		.filter((f) => f.geometry.type === 'LineString')
		.map((f) => geojsonLength(f.geometry))
	const linesLength = lines.length
	const totalLinesLength = lines.reduce((memo, next) => memo + next, 0)
	const totalLinesArea = totalLinesLength * 5 // we arbitrarily define the average width of a pedestrian street to 5 meters
	const totalTotal = totalLinesArea + totalAreas
	return {
		areasLength,
		totalAreas,
		linesLength,
		totalLinesArea,
		totalTotal,
	}
}

// Usefull in the future to disambiguate with a UI
const findCity = (ville) =>
	fetch(
		`https://nominatim.openstreetmap.org/search/${ville}?format=json&addressdetails=1&limit=1`
	).then((r) => r.json())

export const OverpassInstance = 'https://overpass-api.de/api/interpreter'

export const compute = (ville, inform = () => null) => {
	const exceptions = {}
	const overpassRequest = makeRequest(ville),
		request = `${OverpassInstance}?data=${overpassRequest}`

	console.log('On va lancer les requêtes pour ', ville)
	inform({ loading: `On va lancer les requêtes pour ${ville}` })

	return (
		Promise.all([
			fetch(encodeURI(request))
				.then((res) => {
					if (!res.ok) {
						throw res
					}
					return res.json()
				})
				.catch((error) => console.log('erreur dans la requête OSM', error)),

			fetch(
				`https://geo.api.gouv.fr/communes?nom=${ville}&fields=surface,departement,centre,contour&format=json&boost=population`
			).then((res) => res.json()),
		])
			.catch((error) =>
				console.log('erreur dans la requête OSM ou GeoAPI', error)
			)
			// we dangerously take the first element of the geo.api results array, since it's ranked by population and we're only working with the biggest french cities for now
			.then(async ([osm, [geoAPI]]) => {
				const geojson = osmtogeojson(osm)
				const features = geojson.features
				if (!features.length) {
					console.log('geojson', geojson)
					throw Error("La requête n'a rien renvoyé. Cette ville existe bien ?")
				}
				console.log('données OSM récupérées : ', ville)

				const typesCount = countTypes(features)
				const [polygons, meanStreetWidth, streetsWithWidthCount] =
					linesToPolygons(ville, features)
				inform({
					loading: `Donnés OSM récupérées, ${polygons.length} polygones`,
				})

				console.log('will merge')
				const mergedPolygons0 = await mergePolygons2(polygons)
				inform({ loading: `La fusion a été opérée` })

				console.log('merged, will exclude')
				const toCoord = (f) => f.coordinates
				const mergedPolygons1 = toCoord(mergedPolygons0)

				const contour = geoAPI && geoAPI.contour

				const mergedPolygons = contour
					? polygon(mergedPolygons1).intersect(polygon(toCoord(contour)))
					: mergedPolygons1
				const toMulti = (coordinates) => ({ type: 'MultiPolygon', coordinates })
				const relativeSurface = contour
				const pedestrianArea = area(toMulti(mergedPolygons))
				const relativeArea = relativeSurface ? area(relativeSurface) : NaN
				console.log('done computing')
				const result = {
					geoAPI,
					mergedPolygons: toMulti(mergedPolygons),
					pedestrianArea,
					relativeArea,
					streetsWithWidthCount,
					meanStreetWidth,
					//the following is for debug purposes, in case the mergedPolygons and realArea are suspected to be not reliable,
					polygons,
					//...cityScore,
					//typesCount,
					//geojson,
				}
				inform({ data: result })
				return result
			})
	)
}
// This paremeter is very important. It is completely guessed for now. We need more data !
const standardWidth = 0.004

const lineWidth = (f) => {
	const width = f.properties.width
	if (typeof width !== 'string') return standardWidth
	if (isNaN(width)) {
		console.log(
			"On a trouve une largeur qui n'est pas un nombre en mètres : " + width
		)
		return standardWidth
	}
	if (+width === 0) return standardWidth // Some ways, like 126347187 in Angers have a width of 0. Contribution error ? It messes with our buffer function
	const result = +width / 1000
	return result
}

export const linesToPolygons = (ville, features) => {
	const [sum, count] = features.reduce(
			([sum, count], { properties: { width } }) =>
				width != null && !isNaN(width)
					? [sum + +width, count + 1]
					: [sum, count],
			[0, 0]
		),
		meanWidth = sum / count
	console.log(
		`Pour ${ville} la largeur moyenne des rues piétonnes est ${meanWidth} pour ${count} éléments`
	)
	const polygons = features.map((f) =>
		f.geometry.type === 'LineString' ? buffer(f, lineWidth(f)) : f
	)
	return [polygons, meanWidth, count]
}

// The result of the above OSM request is a massive set of shapes
// It can contain a footway in a park, and a park, that obvioulsy overlap
// This is a problem for data transmission (useless JSON weight)
// and especially for the area calculation, hence this deduplication of areas
// At this point, all lineStrings have been converted to Polygons,
// and we're not interested by points yet

// inefficient version
export const mergePolygons = (geojson) => {
	const polygons = geojson.features
		.filter((f) => f.geometry.type === 'Polygon')
		.map((f) => polygon(f.geometry.coordinates))
	const myunion = polygons
		.slice(1)
		.reduce(
			(memo, next, index) => console.log(index) || union(memo, next),
			polygons[0]
		)
	return myunion
}
// efficient version with mapshaper
const mergePolygons2 = async (polygons) => {
	const geojson = buildFeatureCollection(
		polygons.filter((p) => p.geometry.type === 'Polygon')
	)
	const input = { 'input.geojson': geojson }
	const cmd =
		'-i input.geojson -dissolve2 -o out.geojson format=geojson rfc7946'

	const output = await mapshaper.applyCommands(cmd, input)
	return JSON.parse(output['out.geojson'].toString()).geometries[0]
}

const buildFeatureCollection = (features) => ({
	type: 'FeatureCollection',
	features,
})
