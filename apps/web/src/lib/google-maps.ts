import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let hasConfiguredGoogleMapsLoader = false;

export function loadGoogleMapsLibrary(
  library: "maps",
): Promise<google.maps.MapsLibrary>;
export function loadGoogleMapsLibrary(
  library: "marker",
): Promise<google.maps.MarkerLibrary>;
export function loadGoogleMapsLibrary(
  library: "places",
): Promise<google.maps.PlacesLibrary>;
export function loadGoogleMapsLibrary(
  library: string,
): Promise<unknown> {
  if (!hasConfiguredGoogleMapsLoader) {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      v: "weekly",
    });
    hasConfiguredGoogleMapsLoader = true;
  }

  return importLibrary(library);
}
