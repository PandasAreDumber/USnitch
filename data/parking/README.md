# University of Utah parking nodes

One geographic node per parking facility, built from the university's public GIS
snapshot retrieved November 6, 2026 (America/Denver).

## Files

| File | Contents |
| --- | --- |
| `parking_map.html` | Searchable map, lot boundaries, node selection, and directory. Open directly in a browser; map library and street tiles require internet. Directory works offline. |
| `parking_nodes.geojson` | **132 campus nodes**, WGS84 Point features. |
| `parking_nodes.csv` | The same 132 nodes in spreadsheet/database-friendly form. |
| `parking_lots.geojson` | One merged Polygon/MultiPolygon footprint per campus node. |
| `parking_nodes.all.geojson` / `.csv` | **144 nodes**, including 12 satellite facilities. |
| `parking_lots.all.geojson` | Footprints for all 144 nodes. |
| `metadata.json` | Source URLs, source hashes, scope, counts, and limitations. |
| `source/*.geojson` | Rebuildable source geometry with a limited set of public attributes. Staff editor identities are omitted. |

## What counts as a node

Campus scope includes main campus, medical campus, Research Park, and nearby
campus housing. Its explicit selection box is longitude -111.86 to -111.80 and
latitude 40.74 to 40.79. This is a convenient geographic scope, not an official
university ownership boundary. The full dataset also includes downtown, South
Jordan, Midvalley, and Farmington facilities returned by the source.

The sources returned 119 surface features and 113 garage-level features; separate
server count queries verified both totals. Garage levels are merged by lot number
into one footprint and node. Multiple fragments of the same surface lot are also
merged. Lot number **42 is reused** for the Baseball surface lot and Price
Computing Garage at different locations; these retain separate nodes. Use
`node_id`, not `lot_number`, as your database key.

Nodes use an interior representative point of the largest footprint component.
They are not entrances, parking-space locations, or navigable road waypoints.
All generated nodes are verified to lie inside their own merged footprint.
No graph edges or inferred patrol routes are included.

## Use in the app and model

Import `parking_nodes.geojson` for map markers and prediction entities. GeoJSON
coordinates are **[longitude, latitude]**; CSV uses explicitly named columns.

Assign each photo report using the **lot footprints**, not just its nearest node.
With PostGIS, store the footprint in SRID 4326 and query:

```sql
SELECT node_id
FROM parking_lots
WHERE ST_Covers(
  geometry,
  ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)
);
```

There may be zero matches (outside lots/GPS error) or multiple matches (overlapping
facilities/boundary points). Ask the reporter to confirm a lot in those cases;
do not force a nearest-lot assignment. For a multilevel garage, this dataset
intentionally predicts at the whole-garage level.

Aggregate distinct incidents by `node_id` and time window for forecasting. The
dataset contains locations only; it does not contain enforcement observations,
training labels, probabilities, or evidence that an area without reports is safe.

## Source and completeness

- [University campus map](https://map.utah.edu/)
- [Surface Lots service](https://fmags.fm.utah.edu/arcgis/rest/services/mapservices/surface_lots/MapServer/0)
- [Structure Lots service](https://fmags.fm.utah.edu/arcgis/rest/services/mapservices/structure_lots/MapServer/0)

The surface service describes itself as including university-managed and
non-university-managed lots. Source `LOT_CONTROL` codes are preserved as `UCS`,
`PATROL`, `UNCONTROLLED`, or `UNKNOWN`; do not treat all nodes as enforced by the
same agency. The sources provide no reliable active/closed flag. "All" means all
facilities represented in these two services at retrieval, not a guarantee that
every currently operating university lot is present. Construction, new lots, and
source maintenance can change coverage. Parking rules and permit eligibility
are not inferred from this dataset.

## Rebuild

From the repository root:

```sh
python3 -m venv /tmp/usnitch-parking-venv
/tmp/usnitch-parking-venv/bin/pip install -r scripts/parking-requirements.txt
/tmp/usnitch-parking-venv/bin/python scripts/build_parking_nodes.py
```

The builder runs offline using the checked-in source files. It checks unique IDs,
consistent source names, valid merged polygons, and point containment. It also
regenerates CSV files and the map from `scripts/parking_map.template.html`.

For a new snapshot, query both source `/query` endpoints with `where=1=1`,
`outFields=*`, `outSR=4326`, `f=geojson`. Check `/query?where=1%3D1&returnCountOnly=true&f=json`
against the downloaded record count and paginate if needed. Retain only the
existing source attribute allowlist. Update the snapshot date in the builder
before regenerating. Data exports are not refreshed automatically.
