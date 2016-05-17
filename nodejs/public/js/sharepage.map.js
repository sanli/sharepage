/**
 * 地图类应用的一些工具类
 */


// =====================================================
// 快速凸包算法 QuickHull
//   http://westhoffswelt.de/blog/0040_quickhull_introduction_and_php_implementation.html/
// =====================================================
(function(){
    function getDistant(cpt, bl) {
        Vy = bl[1][0] - bl[0][0];
        Vx = bl[0][1] - bl[1][1];
        return (Vx * (cpt[0] - bl[0][0]) + Vy * (cpt[1] -bl[0][1]))
    };


    function findMostDistantPointFromBaseLine(baseLine, points) {
        var maxD = 0;
        var maxPt = new Array();
        var newPoints = new Array();
        for (var idx in points) {
            var pt = points[idx];
            var d = getDistant(pt, baseLine);

            if ( d > 0) {
                newPoints.push(pt);
            } else {
                continue;
            }

            if ( d > maxD ) {
                maxD = d;
                maxPt = pt;
            }

        }
        return {'maxPoint':maxPt, 'newPoints':newPoints}
    };

    var allBaseLines = new Array();
    function buildConvexHull(baseLine, points) {

        //plotBaseLine(baseLine,'rgb(180,180,180)');
        allBaseLines.push(baseLine)
        var convexHullBaseLines = new Array();
        var t = findMostDistantPointFromBaseLine(baseLine, points);
        if (t.maxPoint.length) {
            convexHullBaseLines = convexHullBaseLines.concat( buildConvexHull( [baseLine[0],t.maxPoint], t.newPoints) );
            convexHullBaseLines = convexHullBaseLines.concat( buildConvexHull( [t.maxPoint,baseLine[1]], t.newPoints) );
            return convexHullBaseLines;
        } else {
            return [baseLine];
        }
    };


    this.getConvexHull = function(points) {
        //find first baseline
        var maxX, minX;
        var maxPt, minPt;
        for (var idx in points) {
            var pt = points[idx];
            if (pt[0] > maxX || !maxX) {
                maxPt = pt;
                maxX = pt[0];
            }
            if (pt[0] < minX || !minX) {
                minPt = pt;
                minX = pt[0];
            }
        }
        var ch = [].concat(buildConvexHull([minPt, maxPt], points),
                           buildConvexHull([maxPt, minPt], points))
        return ch;
    };
})();


//==============================================================================
// 百度地图常用函数
//==============================================================================
var SMapLib = window.SMapLib = SMapLib || {};

//判断overlay元素是否是marker
SMapLib.isMarker = function(overlay){
    return /.*Marker.*/.test(overlay.toString());
}

//生成点对象
SMapLib.pointToGeoJSON = function(point){
    return {
        type: 'Point',
        coordinates: SMapLib.pointToLoc(point)
    };
}

//生成bounds的GeoJSON对象
SMapLib.boundsToGeoJSON = function(bounds){
    return {
        type: 'Polygon',
        coordinates: [SMapLib.boundsToPolygon(bounds)]
    }
}

//Loc转化为BaiduMap地址
SMapLib.locToPoint = function(loc){
    return new L.latLng(loc[1], loc[0])
}

SMapLib.pointToLoc = function(point){
    return [parseFloat(point.lng), parseFloat(point.lat)];
}

SMapLib.pointToStr = function(point){
    return point.lng + ',' + point.lat ;
}

SMapLib.strToPoint = function(str){
    var point = str.split(",");
    return new L.latLng(parseFloat(point[1]), parseFloat(point[0]));
}

//生成多边形对象
SMapLib.pointListToGeoJSON = function(points){
    // var coordinates = [];
    // $.each(points, function(i, point){
    //     coordinates.push(SMapLib.pointToLoc(point));
    // });

    // //连接首尾
    // if(coordinates.length > 0){
    //     var last = coordinates[coordinates.length-1], 
    //         first =  coordinates[0];
    //     if(last[0] != first[0] || last[1] != first[1] )
    //         coordinates.push(first);    
    // }
    var coordinates = SMapLib.pointListToPolygon(points);
    return {
        type: 'Polygon',
        coordinates: [coordinates]
    };
}

SMapLib.pointListToPolygon = function(points){
    var coordinates = $.map(points, function(point){
        return [SMapLib.pointToLoc(point)];
    });

    //连接首尾
    if(coordinates.length > 0){
        var last = coordinates[coordinates.length-1], 
            first =  coordinates[0];
        if(last[0] != first[0] || last[1] != first[1] )
            coordinates.push(first);    
    }
    return coordinates;
}

SMapLib.locsToPointList = function(arrays){
    return $.map(arrays, function(cord, idx){
        return SMapLib.locToPoint(cord);
    });
}

SMapLib.boundsToPolygon = function(bounds){
    if( typeof(bounds) === 'object'){
        var minx = bounds.getSouthWest().lng, miny = bounds.getSouthWest().lat,
            maxx = bounds.getNorthEast().lng, maxy = bounds.getNorthEast().lat;         
    }else{
        var boundArray = bounds.split(","),
            minx = parseFloat(boundArray[0]) , miny = parseFloat(boundArray[1]) ,
            maxx = parseFloat(boundArray[2]) , maxy = parseFloat(boundArray[3]) ;
    }

    return [ [minx, miny], [maxx, miny],[maxx, maxy],[minx, maxy],[minx, miny] ];
}


SMapLib.boundsToStr = function(bounds){
    var minx = bounds.getSouthWest().lng,miny = bounds.getSouthWest().lat,
        maxx = bounds.getNorthEast().lng,maxy = bounds.getNorthEast().lat;     
    return minx + ',' + miny + ',' + maxx + ',' + maxy;
}
