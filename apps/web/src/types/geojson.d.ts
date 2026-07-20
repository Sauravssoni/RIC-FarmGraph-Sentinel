/** Allow importing the licensed Natural Earth outline shipped as .geojson. */
declare module "*.geojson" {
  const value: {
    type: string;
    provenance?: string;
    features: { geometry: { type: string; coordinates: [number, number][][] } }[];
  };
  export default value;
}
