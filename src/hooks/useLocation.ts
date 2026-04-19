import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { EmptyLocationModel, LocationModel } from "../models";

export const useLocation = (locationName: string, useMockData: boolean) => {
  const apiKey = process.env.REACT_APP_GEOLOCATION_API_KEY;
  const geocodeBaseUrl = process.env.REACT_APP_GEOLOCATION_GEOCODE_BASEURL;

  const [location, setLocation] =
    useState<LocationModel>(EmptyLocationModel);

  // Save coords locally
  const saveCoords = (lat: number, lon: number) => {
    localStorage.setItem(
      "weather_coords",
      JSON.stringify({ lat, lon })
    );
  };

  // Set location helper
  const setCoords = (
    latitude: number,
    longitude: number,
    locality: string,
    country: string
  ) => {
    setLocation({
      position: {
        latitude,
        longitude,
      },
      locality,
      country,
    });

    saveCoords(latitude, longitude);
  };

  // Reverse geocode GPS → city name
  const getLocationDetails = useCallback(
    (lat: number, lon: number) => {
      axios
        .get(
          useMockData
            ? "./mock-data/locality.json"
            : `${geocodeBaseUrl}?latlng=${lat},${lon}&result_type=locality&key=${apiKey}`
        )
        .then((res: any) => {
          if (res.data?.results?.length > 0) {
            const address =
              res.data.results[0].formatted_address.split(",");

            setCoords(
              lat,
              lon,
              address[0].trim(),
              address[1]?.trim() || ""
            );
          }
        })
        .catch(() => {
          getCoordsByIP();
        });
    },
    [apiKey, geocodeBaseUrl, useMockData]
  );

  // City search support
  const getCoordsByLocationName = useCallback(
    (locationName: string) => {
      axios
        .get(
          useMockData
            ? "./mock-data/latlong.json"
            : `${geocodeBaseUrl}?address=${locationName}&key=${apiKey}`
        )
        .then((res: any) => {
          if (res.data?.results?.length > 0) {
            const location =
              res.data.results[0].geometry.location;

            const address =
              res.data.results[0].formatted_address.split(",");

            setCoords(
              location.lat,
              location.lng,
              address[0].trim(),
              address[1]?.trim() || ""
            );
          }
        })
        .catch(getCoordsByIP);
    },
    [apiKey, geocodeBaseUrl, useMockData]
  );

  // IP fallback
  const getCoordsByIP = () => {
    axios
      .get("https://ipapi.co/json/")
      .then((res) => {
        if (res.data?.latitude) {
          setCoords(
            res.data.latitude,
            res.data.longitude,
            res.data.city,
            res.data.country_name
          );
        } else {
          fallbackTokyo();
        }
      })
      .catch(fallbackTokyo);
  };

  // Last fallback
  const fallbackTokyo = () => {
    setCoords(35.6762, 139.6503, "Tokyo", "JP");
  };

  // GPS detection
  const getCoordsByGPS = useCallback(() => {
    if (!navigator.geolocation) {
      getCoordsByIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        getLocationDetails(
          pos.coords.latitude,
          pos.coords.longitude
        );
      },
      () => {
        getCoordsByIP();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [getLocationDetails]);

  useEffect(() => {
    if (locationName !== "") {
      getCoordsByLocationName(locationName);
      return;
    }

    // Load saved coords first
    const cached = localStorage.getItem("weather_coords");

    if (cached) {
      const coords = JSON.parse(cached);

      if (coords?.lat && coords?.lon) {
        getLocationDetails(coords.lat, coords.lon);
        return;
      }
    }

    getCoordsByGPS();
  }, [locationName, getCoordsByGPS, getCoordsByLocationName, getLocationDetails]);

  return { location };
};
