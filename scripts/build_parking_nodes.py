"""Build one node per physical parking facility from University of Utah GIS.

Run with the dependencies in parking-requirements.txt. No network calls occur.
"""

import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from shapely import make_valid
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "parking"
BASE = "https://fmags.fm.utah.edu/arcgis/rest/services/mapservices"
SOURCES = {
    "surface": f"{BASE}/surface_lots/MapServer/0",
    "garages": f"{BASE}/structure_lots/MapServer/0",
}
# Explicit geographic scope, not an official university property boundary.
CAMPUS_BOUNDS = [-111.86, 40.74, -111.80, 40.79]
CONTROL = {0: "UCS", 1: "PATROL", 2: "UNCONTROLLED", None: "UNKNOWN"}


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")


def polygon_parts(geom):
    if geom.geom_type == "Polygon":
        return [geom]
    if hasattr(geom, "geoms"):
        return [p for child in geom.geoms for p in polygon_parts(child)]
    return []


def build():
    groups = defaultdict(list)
    source_counts = {}
    source_hashes = {}
    for kind in SOURCES:
        path = OUT / "source" / f"{kind}.geojson"
        raw = path.read_bytes()
        data = json.loads(raw)
        assert data["type"] == "FeatureCollection" and not data.get("exceededTransferLimit")
        source_counts[kind] = len(data["features"])
        source_hashes[kind] = hashlib.sha256(raw).hexdigest()
        for feature in data["features"]:
            assert feature["properties"]["lot_no"] is not None
            groups[(feature["properties"]["lot_no"], kind)].append(feature)

    nodes, boundaries = [], []
    for (number, kind), records in sorted(groups.items()):
        names = sorted({r["properties"]["LOTNAME"] for r in records if r["properties"]["LOTNAME"]})
        assert len(names) == 1, f"Review inconsistent facility names: {number}, {names}"
        # Union all floors/fragments, preserving holes and disconnected components.
        footprint = unary_union([
            p for record in records
            for p in polygon_parts(make_valid(shape(record["geometry"])))
        ])
        assert not footprint.is_empty and footprint.is_valid
        # The centroid of a concave lot can fall outside it. Use an interior point
        # of its largest component instead. This is a display/aggregation node.
        largest = max(polygon_parts(footprint), key=lambda p: p.area)
        point = largest.representative_point()
        assert footprint.covers(point)
        lon, lat = point.x, point.y
        west, south, east, north = CAMPUS_BOUNDS
        campus = west <= lon <= east and south <= lat <= north
        properties = {
            "node_id": f"utah-{kind}-{number:03d}",
            "lot_number": number,
            "name": names[0],
            "facility_type": "surface_lot" if kind == "surface" else "garage",
            "scope": "campus" if campus else "satellite",
            "longitude": lon,
            "latitude": lat,
            "levels": sorted({r["properties"]["level_"] for r in records if r["properties"]["level_"] is not None}),
            "control": sorted({CONTROL.get(r["properties"]["LOT_CONTROL"], "UNKNOWN") for r in records}),
            "source_feature_count": len(records),
            "source_object_ids": sorted(r["properties"]["OBJECTID"] for r in records),
            "source_url": SOURCES[kind],
            "position_method": "point_on_surface_largest_component",
        }
        nodes.append({"type": "Feature", "id": properties["node_id"], "properties": properties, "geometry": mapping(point)})
        boundaries.append({"type": "Feature", "id": properties["node_id"], "properties": properties, "geometry": mapping(footprint)})

    assert len({f["id"] for f in nodes}) == len(nodes)
    for suffix, filtered_nodes, filtered_bounds in [
        ("", [f for f in nodes if f["properties"]["scope"] == "campus"], [f for f in boundaries if f["properties"]["scope"] == "campus"]),
        (".all", nodes, boundaries),
    ]:
        assert len(filtered_nodes) == len(filtered_bounds)
        for node, boundary in zip(filtered_nodes, filtered_bounds):
            assert node["id"] == boundary["id"]
            assert shape(boundary["geometry"]).covers(shape(node["geometry"]))
        write_json(OUT / f"parking_nodes{suffix}.geojson", {"type": "FeatureCollection", "features": filtered_nodes})
        write_json(OUT / f"parking_lots{suffix}.geojson", {"type": "FeatureCollection", "features": filtered_bounds})
        rows = [f["properties"] for f in filtered_nodes]
        with (OUT / f"parking_nodes{suffix}.csv").open("w", newline="") as stream:
            fields = ["node_id", "lot_number", "name", "facility_type", "scope", "longitude", "latitude"]
            writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)

    metadata = {
        "source": "University of Utah public Facilities GIS",
        "snapshot_date_local": "2026-11-06",
        "timezone": "America/Denver",
        "coordinate_system": "WGS84 longitude,latitude (GeoJSON)",
        "campus_selection_bbox": CAMPUS_BOUNDS,
        "campus_nodes": sum(f["properties"]["scope"] == "campus" for f in nodes),
        "all_nodes": len(nodes),
        "source_records": source_counts,
        "source_sha256": source_hashes,
        "source_urls": SOURCES,
        "notes": [
            "All returned records included; source counts independently verified at retrieval.",
            "Garage floors and same-number surface fragments are merged.",
            "Lot 42 is reused for Baseball and Price Computing Garage; facility type distinguishes IDs.",
            "Campus scope includes main campus, medical campus, Research Park and nearby campus housing by explicit bounding box.",
            "No active/closed status is provided; completeness is relative to this public GIS snapshot.",
            "Node is an interior representative point, not an entrance or individual parking space.",
        ],
    }
    (OUT / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    # Embed data so the preview can be opened directly without a local API.
    preview = (ROOT / "scripts" / "parking_map.template.html").read_text()
    # Reduced geometry only affects preview size, not the exported data.
    display_bounds = [{**f, "geometry": mapping(shape(f["geometry"]).simplify(0.000006, preserve_topology=True))} for f in boundaries]
    preview = preview.replace("__PARKING_NODES__", json.dumps(nodes).replace("<", "\\u003c"))
    preview = preview.replace("__PARKING_BOUNDARIES__", json.dumps(display_bounds).replace("<", "\\u003c"))
    (OUT / "parking_map.html").write_text(preview)
    print(json.dumps({"campus_nodes": metadata["campus_nodes"], "all_nodes": len(nodes), "source_records": source_counts, "geometry_validation": "passed"}, indent=2))


if __name__ == "__main__":
    build()
