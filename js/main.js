
import L from "leaflet";
import React from "react";
import { render } from "react-dom";
import firebase from "firebase";
import LeafletDraw from "leaflet-draw";
import LeafletGeometryUtil from "leaflet-geometryutil";

import Button from '@material-ui/core/Button';
import Snackbar from "@material-ui/core/Snackbar";

let Angled = 0;
let Parallel = 1;
let CarParkWidth = 2.4;
let Angled_Length = 4.8;
let Parallel_Length = 5.4;
let Angled_1Way_Aisle = 6;
let Angled_2Way_Aisle = 6.6;
let Parallel_1Way_Aisle = 3.6;
let Parallel_2Way_Aisle = 6;

let __DRAW = true;
let __DRAW_ROAD = true;
let __INTERNAL_GENERATING = true;
let __FIT_BOUNDS = false;

firebase.initializeApp({
    apiKey: "AIzaSyCpQ67L2jxD_vsTjIiccgBr60sgC3LH7Yc",
    authDomain: "carpark-3fc4b.firebaseapp.com",
    databaseURL: "https://carpark-3fc4b.firebaseio.com",
    projectId: "carpark-3fc4b",
    storageBucket: "",
    messagingSenderId: "991207861960"
});

firebase.auth().signInAndRetrieveDataWithCredential(firebase.auth.EmailAuthProvider.credential("a@b.com", "test123"));

let map = L.map("map").setView([1.35677, 103.8200699], 19);
let layerGroup = L.layerGroup();
layerGroup.addTo(map);

let street = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
    maxZoom: 22,
    id: "mapbox.streets",
    accessToken: "pk.eyJ1IjoidGV0cmFzaGluZSIsImEiOiJjaW5tZjFmMXgwem1jdWlrajY4enRlN29nIn0.idUb2vXfUyThs-ZHNRemXg"
});

street.addTo(map);

//let cp = [];

//known problems
//1) tight angle (<90) between area causes impossible-to-drive & park lots
//2) small overlapping area
//3) slow internal

//tight angle
/*let cp = [
    [1.357762289845752, 103.818815946579],
    [1.3563191102011094, 103.8189071416855],
    [1.3570165577205422, 103.81945967674257],
    [1.3578159396300515, 103.81934702396394],
    [1.3577676548242303, 103.818815946579]
];*/

//small overlapping area
/*let cp =[
    [1.3565410099139856, 103.82015903023031],
    [1.3565417332951493, 103.82015993165471],
    [1.3563268127133283, 103.82051456694151],
    [1.3562671680101281, 103.82051604011592],
    [1.3562679091607217, 103.82015811158628],
    [1.3565410099139856, 103.82015903023031]
];*/

//odd shape
/*let cp = [
    [1.357762289845752, 103.818815946579],
    [1.3563191102011094, 103.8189071416855],
    [1.35650151957176, 103.82172346115112],
    [1.3580037138657746, 103.82168054580688],
    [1.3579500640856226, 103.82035017013551],
    [1.3571077623813008, 103.82040381431581],
    [1.3570165577205422, 103.81945967674257],
    [1.3578159396300515, 103.81934702396394],
    [1.3577676548242303, 103.818815946579]
];*/

// working
/*let cp = [
    [1.3577340214162406, 103.81852652470117],
    [1.357744076876083, 103.8188342138892],
    [1.3580512083071161, 103.81884638860357],
    [1.3580517477405638, 103.81853297876661],
    [1.3577340214162406, 103.81852652470117],
];*/

// missing area not generated
/*let cp = [
    [1.3593930407917294, 103.81853221915664],
    [1.3574485248978956, 103.81799200549723],
    [1.357261158133274, 103.81921806838365],
    [1.3594269779451849, 103.82036261726172],
    [1.3593930407917294, 103.81853221915664],
];*/

// large non-generated places
let cp = [
    [1.3586269656819374,103.82415836211294],
    [1.35641969983983,103.8230514060706],
    [1.3552676208953454,103.82278678938746],
    [1.3547907986586425,103.82297689095141],
    [1.3548803102700693,103.82473185192795],
    [1.3555104132247744,103.82629348430784],
    [1.356375426209527,103.82678173016757],
    [1.3585566142764482,103.82587233558299],
    [1.3591750609182445,103.82578290067615],
    [1.3586269656819374,103.82415836211294],
]

class CarParkUi extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            action: <div/>,
            showSnackbar: true,
            snackMessage: "Start by drawing car park area on the map"
        };

        if (cp.length > 0) {
            drawPolygon(cp, "red");
            generateLots(cp);

        } else {
            this.polyline = new L.Draw.Polyline(map);
            this.polyline.enable();
            map.on(L.Draw.Event.CREATED, (event) => {
                let layer = event.layer;
                let latLngs = layer.getLatLngs();
                let latLngsArr = processRoad(latLngs);

                this.setState({
                    start: false,
                    showSnackbar: false,
                    action: <div>
                        <Button size="small" variant="contained" onClick={this.onSave.bind(this)}>Save</Button>
                        <Button size="small" variant="contained" onClick={this.onRetry.bind(this)}>Try Again</Button>
                    </div>,
                    snackMessage: "Click on 'Save' if the generated car park has any issues",
                    carpark: latLngs
                });
                this.polyline.disable();

                __DRAW ? drawPolygon(latLngsArr, "red") : "";
                generateLots(latLngsArr);

                this.setState({
                    showSnackbar: true
                });
            });
        }
    }

    onSave() {
        firebase.database().ref('wrongs/' + Date.now()).set({
            carpark: this.state.carpark
        });

        this.setState({
            action: <div/>,
            showSnackbar: true,
            snackMessage: "Thanks for your feedback",
            action: <Button size="small" variant="contained" onClick={this.onRetry.bind(this)}>Try Again</Button>
        });
    }

    onRetry() {
        this.polyline.enable();
        layerGroup.clearLayers();

        this.setState({
            action: <div/>,
            showSnackbar: true,
            snackMessage: "Start by drawing car park area on the map"
        });
    }

    render() {
        return (<Snackbar
            open={this.state.showSnackbar}
            message={ this.state.snackMessage }
            action={ this.state.action }
        />);
    }
}

render(<CarParkUi/>, document.querySelector("#material-ui"));

//generateLots(carpark1);

/*let drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer;

    drawnItems.addLayer(layer);
});*/

/*map.on("keypress", (_) => {
    //console.log(map.getCenter());
    //console.log(drawnItems.toGeoJSON());
});

map.on("click", (_) => {
    console.log(_.latlng);
});*/

//////////////////////////////////////////////////////////////////////////////////////////////////////////

/*let carpark1 = [
    [1.301132, 103.836941],
    [1.301137, 103.835718],
    [1.300542, 103.835723],
    [1.300562, 103.836966],
    [1.301132, 103.836941]
];
let cp1 = L.polygon(carpark1, {color: "red"}).addTo(map);

map.fitBounds(cp1.getBounds());*/

//let details = d3plus.largestRect(carpark1);
//let within = L.polygon(details.points, {color: 'green'}).addTo(map);

//////////////////////////////////////////////////////////////////////////////////////////////////////////
// function placeLots()
//      1. for each line
//          1.1 find the start point of reference from prev line and end point that can start to place lot
//          1.2 check if last line, if last, find the last point of ref that can place lot
//          1.3 calculate distance of line and find the largest number of lots to place
//          1.4 place lots in the center of the line
//      2. place road
//      3. cut polygon off from external road border
//      4. recusively call placeLots using remaining area


function drawGeojson(geojson) {
    let x = L.geoJSON(geojson, {});
    layerGroup.addLayer(x);
    __FIT_BOUNDS ? map.fitBounds(x.getBounds()) : "";
}

function drawPoint(a, icon=null) {
    let x = L.marker(a, icon ? {
        icon: icon
    } : null);

    layerGroup.addLayer(x);
}

function drawLine(a, b, color="blue") {
    let x = L.polyline([a, b], {color: color});

    layerGroup.addLayer(x);
    __FIT_BOUNDS ? map.fitBounds(x.getBounds()) : "";
}

function drawPolygon(a, color="green") {
    let x = L.polygon(a, {color: color});

    layerGroup.addLayer(x);
    __FIT_BOUNDS ? map.fitBounds(x.getBounds()) : "";
}

function generateAngledLots(start, end, areaGeom, clockwise=true) {
    let cpStart = start, cpEnd, lot;
    let bearing = L.GeometryUtil.bearing(start, end);
    let distance = start.distanceTo(end);
    let maxLots = Math.floor(distance / CarParkWidth);

    let next = [];
    let lots = [];

    for (let i = 0; i < maxLots; i++) {
        cpEnd = L.GeometryUtil.destination(cpStart, bearing, CarParkWidth);
        lot = generateAngledLot(cpStart, cpEnd, clockwise);

        let p3 = turf.point(toArray(lot[2]));
        let p4 = turf.point(toArray(lot[3]));

        if (turf.booleanPointInPolygon(p3, areaGeom) && turf.booleanPointInPolygon(p4, areaGeom)) {
            lots.push(lot);
            __DRAW ? drawPolygon(lot) : "";
        }

        //find where to start next: code below takes the last point of first lot and third point of last lot
        if (i == 0) {
            next[0] = lot[3];
        }

        if (i == maxLots - 1) {
            next[1] = lot[2];
        }
        /////////////////////////

        cpStart = cpEnd;
    }

    return [lots, next];
}

function generateAngledLot(coord1, coord2, clockwise=true) {
    //1. find point within line 1 that is perpendicular to line(start, end) by rotating 90 deg from start
    //   find coord3 by getting bearing and calculating destination from start
    let coord3 = getPerpendicularDestination(map, coord2, coord1, Angled_Length, clockwise);

    //2. find point within line 2 that is perpendicular to line(start, end) by rotating 90 deg from start
    //   find coord3 by getting bearing and calculating destination from start
    let coord4 = getPerpendicularDestination(map, coord1, coord2, Angled_Length, !clockwise);

    //4. return 4 coordinates
    return [coord1, coord2, coord3, coord4];
}

function toLatLng(a) {
    return L.latLng(a[0], a[1]);
}

function toArray(latLng) {
    return [latLng.lat, latLng.lng];
}

function toPoint(a) {
    return L.point(a[0], a[1]);
}

function calcBufferDistance(a, b, c, length = Angled_Length) {
    let angle1 = L.GeometryUtil.computeAngle(toPoint(a), toPoint(b));
    let angle2 = L.GeometryUtil.computeAngle(toPoint(b), toPoint(c));
    let triangleAngle = (angle2 + Math.sign(angle1) * (180 - Math.abs(angle1))) / 2;
    let subDistance = length / Math.tan(triangleAngle * (Math.PI / 180));
    return triangleAngle < 0 && triangleAngle > -90 ? [0, true] : [subDistance, false];
}

//1. for each line
//  1.1 find the start point of reference from prev line and end point that can start to place lot
//  1.2 check if last line, if last, find the last point of ref that can place lot
//  1.3 calculate distance of line and find the largest number of lots to placeLots
//  1.4 place lots in the center of the line
//2. Merge all roads
function generateLots(points, skip=false) {
    if (points.length <= 2) return;
    let union;
    let startExceedAngle = false, endExceedAngle = false;
    let first = points[0], second, third, start, end, startDistance = 0, roadCoord1, roadCoord2;
    let len = points.length;
    let lots = [], roads = [], outer = [], inner = [];
    let clockwise = turf.booleanClockwise(points);

    //1. for each line
    if (!skip) {
        points.forEach((point, index) => {
            if (index == 0) return;

            second = point;
            third = (index + 1 < len) ? points[((index + 1) % len)] : points[1];

            let firstLatLng = toLatLng(first);
            let secondLatLng = toLatLng(second);
            let thirdLatLng = toLatLng(third);

            start = firstLatLng;
            end = secondLatLng;

            let bearing = L.GeometryUtil.bearing(firstLatLng, secondLatLng);
            let reverseBearing = L.GeometryUtil.bearing(secondLatLng, firstLatLng);

            //1.1 find the relational start point of placing lot so that next line can continue to place lots
            let calcStart;
            if (index == 1) {
                [startDistance, startExceedAngle] = calcBufferDistance(points[len - 2], first, second, Angled_Length);
            }

            calcStart = L.GeometryUtil.destination(start, bearing, startDistance);

            //1.2 find the relational end point of placing lot so that next line can continue to place lots
            let subDistance;
            [subDistance, endExceedAngle] = calcBufferDistance(first, second, third, Angled_Length);
            let calcEnd = L.GeometryUtil.destination(end, reverseBearing, subDistance);

            //1.3 calculate distance of line and find the largest number of lots to place
            let startLatLng = calcStart;
            let endLatLng = calcEnd;
            let distance = startLatLng.distanceTo(endLatLng);
            let maxLots = Math.floor(distance / CarParkWidth);
            let remainingHalfDist = (distance - (maxLots * CarParkWidth)) / 2;

            //1.4 place lots in the center of the line
            let cpStart = L.GeometryUtil.destination(startLatLng, bearing, remainingHalfDist);
            let cpEnd;

            //draw all the parking lots out
            for (let i = 0; i < maxLots; i++) {

                cpEnd = L.GeometryUtil.destination(cpStart, bearing, CarParkWidth);
                let lot = generateAngledLot(cpStart, cpEnd);

                lots.push(lot);
                __DRAW ? drawPolygon(lot) : "";

                if (i == 0) {
                    roadCoord1 = lot[3];
                }

                if (i == maxLots - 1) {
                    roadCoord2 = lot[2];
                }

                cpStart = cpEnd;
            }

            //generate roads in front of each parking lot
            inner.push(generateRoad2(roadCoord1, roadCoord2, clockwise));
            outer.push(roadCoord1);
            outer.push(roadCoord2);

            startDistance = subDistance;
            startExceedAngle = endExceedAngle;
            first = second;
        });

        //transform to points in array only and connect to first coord
        inner = inner.map(_ => {
            return [toArray(_[0]), toArray(_[1])];
        });

        outer = outer.map(_ => {
            return toArray(_);
        });
        outer.push(outer[0]);

        //2. loop thru every 2 lines in inner to find intersection
        //  2.1. if intersection exists, the 2 inner points can be removed
        //  2.2. else push in all 4 points
        let line1, line2, intersect;
        let innerPolygon = [];

        for (let i = 0, len = inner.length; i < len; i++) {
            line1 = turf.lineString(inner[((i - 1 + inner.length) % inner.length)]);
            line2 = turf.lineString(inner[i % inner.length]);
            intersect = turf.lineIntersect(line1, line2);

            if (intersect.features.length > 0) {
                // 2.1
                innerPolygon.push(intersect.features[0].geometry.coordinates);
            } else {
                // 2.2
                innerPolygon.push(inner[i % inner.length][0]);
            }
        }

        innerPolygon.push(innerPolygon[0]);

        union = turf.polygon([outer]);
        union.geometry.coordinates.push(innerPolygon);

    } else {
        union = turf.polygon([points]);
    }

    if (__INTERNAL_GENERATING) {

        //generate carpark lots internally
        let p, road, turfPolygon, coords, completed = {}, cont = true, rounds = 0, allGenerated = false;
        let initIndex = skip ? 0 : 1;
        while(cont && !allGenerated && rounds < 10) {
            allGenerated = true;
            rounds++;
            for (let i = initIndex; i < union.geometry.coordinates.length; i++) {
                coords = union.geometry.coordinates[i];
                clockwise = turf.booleanClockwise(coords);

                // check if has been completed
                if (checkIfCompleted(coords, completed)) continue;
                allGenerated = false;

                //find longest of next 2 coordinates
                let longestDist = 0;
                let longestIndex = -1;
                for (let j = 0, end = coords.length - 2; j < end; j++) {

                    let first = toLatLng(coords[j]);
                    let second = toLatLng(coords[j+1]);
                    let dist = first.distanceTo(second);

                    if (dist > longestDist) {
                        longestDist = dist;
                        longestIndex = j;
                    }
                }

                //generate carpark using the longest length
                road = generateFullLots(coords, clockwise, longestIndex, longestIndex+1, rounds);

                //joining road back to road-system
                if (road) {
                    p = processRoad(road);
                    turfPolygon = turf.polygon([p]);
                    union = turf.union(union, turfPolygon);
                } else {
                    cont = false;
                }

                completed[coords[longestIndex].toString()] = true;

                break;
            }
        }

    }

    __DRAW_ROAD ? drawGeojson(turf.flip(union)) : "";
}

function checkIfCompleted(coords, completed) {
    let keys = Object.keys(completed);
    return coords.some(coord => {
        let coordInStr = coord.toString();
        return keys.some(key => {
            return key == coordInStr;
        });
    });
}

function compare(coordA, coordB) {
    return coordA[0] == coordB[0];
}

function processRoad(road) {
    let points = road.map(point => {
        return [point.lat, point.lng];
    });

    points.push(points[0]);

    return points;
}

function reversePoint(point) {
    return [point[1], point[0]];
}

//1. start with first 2 points,
//2. find point to start draw and point to end
//3. calc max number and populate them
//4. populate second row of carpark lots
//5. move next along line1 & line2
//6. generate road
function generateFullLots(area, clockwise=false, id0=0, id1=1) {
    let road, areaGeom = turf.polygon([area]);
    try {
        let first = area[id0];
        let second = area[id1];

        //1. start with first 2 points,
        //2. find point to start draw and point to end
        //      2.1 find line before (line1) and after (line2)
        let line = findLineFromArea(area, id0);
        let line1 = findLineFromArea(area, id1);
        let line2 = reversePoint(findLineFromArea(area, id0-1));

        //      2.2 find corresponding start and end point
        let angle1 = findAngleBetween(line, line2);
        let angle2 = findAngleBetween([line[1], line[0]], line1);

        first = findTransitionPoint(angle1, line, first);
        second = findTransitionPoint(angle2, [line[1], line[0]], second);

        //3. calc max number and populate them
        let lots, next;

        [lots, next] = generateAngledLots(first, second, areaGeom, clockwise);
        if (lots.length <= 0) {
            return null;
        }

        //4. populate second row of carpark lots
        next = nextToIntersect(next, line1, line2);
        let nextArr = [toArray(next[0]), toArray(next[1])];

        next[0] = findTransitionPoint(angle1, nextArr, nextArr[0]);
        next[1] = findTransitionPoint(angle2, [nextArr[1], nextArr[0]], nextArr[1]);

        [lots, next] = generateAngledLots(...next, areaGeom, clockwise);
        if (lots.length <= 0) {
            return null;
        }

        //5. move next along line1 & line2
        next = nextToIntersect(next, line1, line2);

        //6. generate road
        road = generateRoad(...next, clockwise);

        //from new road coords, continue extend to hit line1 & 2
        let newRoadCoords = nextToIntersect([road[2], road[3]], line1, line2);

        let bearing1 = L.GeometryUtil.bearing(road[0], road[1]);
        let revBearing1 = L.GeometryUtil.bearing(road[1], road[0]);
        let bearing2 = L.GeometryUtil.bearing(newRoadCoords[1], newRoadCoords[0]);
        let revBearing2 = L.GeometryUtil.bearing(newRoadCoords[0], newRoadCoords[1]);
        let ext1 = L.GeometryUtil.destination(road[1], bearing1, Angled_1Way_Aisle / 2);
        let ext0 = L.GeometryUtil.destination(road[0], revBearing1, Angled_1Way_Aisle / 2);
        let ext3 = L.GeometryUtil.destination(newRoadCoords[0], bearing2, Angled_1Way_Aisle / 2);
        let ext2 = L.GeometryUtil.destination(newRoadCoords[1], revBearing2, Angled_1Way_Aisle / 2);
        road = [ext0, ext1, ext2, ext3];
    } catch (ex) {
        console.log("error occurred");
        console.log(ex);
        //drawPolygon(area, "red");
    }

    return road;
}

function findTransitionPoint(angle, line, point) {
    if (angle < 90) {
        let bearing = L.GeometryUtil.bearing(toLatLng(line[0]), toLatLng(line[1]));
        let distance = Angled_Length / Math.tan(angle * (Math.PI / 180));
        point = L.GeometryUtil.destination(toLatLng(line[0]), bearing, distance);
    } else {
        point = toLatLng(point);
    }

    return point;
}

function generateRoad2(coord1, coord2, clockwise) {
    let coord3 = getPerpendicularDestination(map, coord1, coord2, Angled_1Way_Aisle, !clockwise);
    let coord4 = getPerpendicularDestination(map, coord2, coord1, Angled_1Way_Aisle, clockwise);

    return [coord3, coord4];
}

function generateRoad(coord1, coord2, clockwise) {
    let coord3 = getPerpendicularDestination(map, coord2, coord1, Angled_1Way_Aisle, clockwise);
    let coord4 = getPerpendicularDestination(map, coord1, coord2, Angled_1Way_Aisle, !clockwise);

    return [coord1, coord2, coord3, coord4];
}

function getPerpendicularDestination(map, from, point2, distance, clockwise) {
    let pointOnLine = L.GeometryUtil.rotatePoint(map, point2, clockwise ? 90 : -90, from);
    let bearing = L.GeometryUtil.bearing(from, pointOnLine);
    let destination = L.GeometryUtil.destination(from, bearing, distance);
    return destination;
}

//find the line that intersect line1 & line2 by continuing line next
function nextToIntersect(next, line1, line2) {
    line1 = extendLineCoords([toLatLng(line1[0]), toLatLng(line1[1])]);
    line2 = extendLineCoords([toLatLng(line2[0]), toLatLng(line2[1])]);

    let turfLine1 = turf.lineString(line1);
    let turfLine2 = turf.lineString(line2);

    let intersect1Coords = extendLineTillIntersect(next, turfLine1);
    let intersect2Coords = extendLineTillIntersect(next, turfLine2);

    if (!intersect1Coords) {
        intersect1Coords = [next[0].lat, next[0].lng];
    }

    if (!intersect2Coords) {
        intersect2Coords = [next[1].lat, next[1].lng];
    }

    return [toLatLng(intersect2Coords), toLatLng(intersect1Coords)];
}

function extendLineTillIntersect(line, turfIntersect, repeat=5) {
    let extended = line, turfLine, intersect;
    let n = 0;
    while(n++ < repeat) {
        extended = extendLineCoords(extended, Angled_Length, false);
        turfLine = turf.lineString(extended.map(_ => {
            return [_.lat, _.lng];
        }));
        intersect = turf.lineIntersect(turfLine, turfIntersect);

        if (intersect.features.length > 0) {
            return intersect.features[0].geometry.coordinates;
        }
    }
}

function extendLineCoords(line, by=Angled_Length, retInCoords=true) {
    let bearing = L.GeometryUtil.bearing(...line);
    let revBearing = L.GeometryUtil.bearing(line[1], line[0]);

    let ext2 = L.GeometryUtil.destination(line[1], bearing, by);
    let ext1 = L.GeometryUtil.destination(line[0], revBearing, by);

    return retInCoords ? [ext1, ext2].map(_ => {
        return [_.lat, _.lng];
    }) : [ext1, ext2];
}

function findLineFromArea(area, index) {
    let len = area.length;
    let _index = index < 0 ? index + len - 1 : index;

    if (_index > (len - 1)) return null;

    return [area[_index], area[_index + 1]];
}

function findAngleBetween(line1, line2, clockwise=true) {
    let angle1 = findAbsAngle(L.GeometryUtil.bearing(toLatLng(line1[0]), toLatLng(line1[1])));
    let angle2 = findAbsAngle(L.GeometryUtil.bearing(toLatLng(line2[0]), toLatLng(line2[1])));
    let angle = (Math.abs(angle2 > angle1 ? angle2 - angle1 : angle1 - angle2));
    return angle > 180 ? 360 - angle : angle;
}

function findAbsAngle(angle) {
    return angle < 0 ? angle + 360 : angle;
}
