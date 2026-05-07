import api from './api';
import type { IDataResult, City, Gender } from '../types';

export interface ReverseGeocodeCityDto {
    cityCode: number;
    cityName: string;
    resolvedAddress?: string | null;
}

export const constantService = {
    getCities: async () => {
        return api.get<IDataResult<City[]>>('/constant/cities');
    },
    getGenders: async () => {
        return api.get<IDataResult<Gender[]>>('/constant/genders');
    },
    reverseGeocodeCity: async (lat: number, lng: number) => {
        return api.get<IDataResult<ReverseGeocodeCityDto>>(`/constant/reverse-geocode?lat=${lat}&lng=${lng}`);
    }
};