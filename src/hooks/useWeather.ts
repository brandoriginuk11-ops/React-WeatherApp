import axios from "axios";
import { useEffect, useState } from "react";
import { useErrorHandler } from "react-error-boundary";
import { useLocation } from ".";
import {
  CurrentWeatherModel,
  DailyWeatherDetailsModel,
  DailyWeatherModel,
  EmptyCurrentWeather,
  EmptyDailyWeatherModel,
  EmptyHourlyWeatherModel,
  HourlyWeatherModel,
} from "../models";

export const useWeather = (
  locationName: string,
  unit: string,
  useMockData: boolean
) => {

  const baseUrl = process.env.REACT_APP_OPENWEATHER_API_BASEURL;
  const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;

  const { location } = useLocation(locationName, useMockData);

  const [isLoading, setIsLoading] = useState(true);

  const [currentWeather, setCurrentWeather] =
    useState<CurrentWeatherModel>(EmptyCurrentWeather);

  const [hourlyWeather, setHourlyWeather] =
    useState<HourlyWeatherModel>(EmptyHourlyWeatherModel);

  const [dailyWeather, setDailyWeather] =
    useState<DailyWeatherModel>(EmptyDailyWeatherModel);

  const handleError = useErrorHandler();

  useEffect(() => {

    if (!location?.position?.latitude) return;

    setIsLoading(true);

    const lat = location.position.latitude;
    const lon = location.position.longitude;

    const currentUrl =
      `${baseUrl}weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${apiKey}`;

    const forecastUrl =
      `${baseUrl}forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${apiKey}`;

    Promise.all([
      axios.get(currentUrl),
      axios.get(forecastUrl),
    ])

      .then(([currentRes, forecastRes]) => {

        setCurrent(currentRes.data);

        setHourly(forecastRes.data.list.slice(0, 8));

        setDaily(forecastRes.data.list);

      })

      .catch(handleError)

      .finally(() => {

        setTimeout(() => setIsLoading(false), 200);

      });

  }, [
    location,
    unit,
    apiKey,
    baseUrl,
    handleError,
  ]);



  const setCurrent = (data: any) => {

    setCurrentWeather({

      dt: data.dt,

      weather: {
        icon: data.weather[0].icon,
        description: data.weather[0].description,
      },

      temp: data.main.temp,

      feels_like: data.main.feels_like,

      details: {
        rain: 0,
        visibility: data.visibility / 1000,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        wind_speed: data.wind.speed,
      },

    });

  };



  const setHourly = (data: any[]) => {

    const hourly: CurrentWeatherModel[] = [];

    data.forEach((item: any) => {

      hourly.push({

        dt: item.dt,

        weather: {
          icon: item.weather[0].icon,
          description: item.weather[0].description,
        },

        temp: item.main.temp,

        feels_like: item.main.feels_like,

        details: {
          rain: item.pop * 100,
          visibility: item.visibility
            ? item.visibility / 1000
            : 0,
          humidity: item.main.humidity,
          pressure: item.main.pressure,
          wind_speed: item.wind.speed,
        },

      });

    });

    setHourlyWeather({ hourly });

  };



  const setDaily = (data: any[]) => {

    const dailyMap = new Map<string, any>();

    data.forEach((item) => {

      const date = new Date(item.dt * 1000)
        .toISOString()
        .split("T")[0];

      if (!dailyMap.has(date)) {

        dailyMap.set(date, item);

      }

    });

    const daily: DailyWeatherDetailsModel[] = [];

    Array.from(dailyMap.values())
      .slice(1, 8)
      .forEach((item: any) => {

        daily.push({

          dt: item.dt,

          clouds: item.clouds.all,

          humidity: item.main.humidity,

          pressure: item.main.pressure,

          sunrise: 0,

          sunset: 0,

          minTemp: item.main.temp_min,

          maxTemp: item.main.temp_max,

          uvi: 0,

          weather: {
            icon: item.weather[0].icon,
            description:
              item.weather[0].description,
          },

          wind_speed: item.wind.speed,

          rain: item.pop * 100,

        });

      });

    setDailyWeather({ daily });

  };



  return {

    isLoading,
    location,
    currentWeather,
    hourlyWeather,
    dailyWeather,

  };

};
