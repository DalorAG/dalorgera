import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  CreateWarrantyRequest,
  Device,
  DeviceInput,
  DeviceStatus,
  DocumentItem,
  DocumentKind,
  DocumentMimeType,
  ItemIdentification,
  LuxuryItem,
  LuxuryItemInput,
  MarketValueEstimate,
  Me,
  ReceiptExtraction,
  Reminder,
  ReminderSettings,
  UploadUrl,
  WarrantyRequest,
} from '@/lib/api-types';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/** RTK Query client for the NestJS backend. Adds the Supabase access token to every request. */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: env.apiUrl,
    prepareHeaders: async (headers) => {
      // getSession() refreshes an expired token before returning it.
      const { data } = await supabase.auth.getSession();
      if (data.session) headers.set('authorization', `Bearer ${data.session.access_token}`);
      return headers;
    },
  }),
  tagTypes: ['Me', 'Device', 'Document', 'Reminder', 'ReminderSettings', 'WarrantyRequest', 'LuxuryItem'],
  endpoints: (build) => ({
    getMe: build.query<Me, void>({
      query: () => 'me',
      providesTags: ['Me'],
    }),
    deleteAccount: build.mutation<void, void>({
      query: () => ({ url: 'me', method: 'DELETE' }),
    }),
    acceptTerms: build.mutation<void, { version: string }>({
      query: (body) => ({ url: 'me/terms', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),

    getDevices: build.query<Device[], { status?: DeviceStatus } | void>({
      query: (params) => ({ url: 'devices', params: params ?? undefined }),
      providesTags: (result) => [
        { type: 'Device', id: 'LIST' },
        ...(result ?? []).map((d) => ({ type: 'Device' as const, id: d.id })),
      ],
    }),
    getDevice: build.query<Device, string>({
      query: (id) => `devices/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Device', id }],
    }),
    createDevice: build.mutation<Device, DeviceInput>({
      query: (body) => ({ url: 'devices', method: 'POST', body }),
      // Me carries the device count of the plan.
      invalidatesTags: [{ type: 'Device', id: 'LIST' }, 'Reminder', 'Me'],
    }),
    updateDevice: build.mutation<Device, { id: string } & Partial<DeviceInput>>({
      query: ({ id, ...body }) => ({ url: `devices/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Device', id }, { type: 'Device', id: 'LIST' }, 'Reminder'],
    }),
    deleteDevice: build.mutation<void, string>({
      query: (id) => ({ url: `devices/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Device', id: 'LIST' }, 'Document', 'Reminder', 'Me'],
    }),

    getDocuments: build.query<DocumentItem[], { deviceId?: string; q?: string } | void>({
      query: (params) => ({ url: 'documents', params: params ?? undefined }),
      providesTags: ['Document'],
    }),
    createUploadUrl: build.mutation<UploadUrl, { mimeType: DocumentMimeType }>({
      query: (body) => ({ url: 'documents/upload-url', method: 'POST', body }),
    }),
    createDocument: build.mutation<
      DocumentItem,
      { storagePath: string; kind: DocumentKind; mimeType: DocumentMimeType; sizeBytes?: number; deviceId?: string }
    >({
      query: (body) => ({ url: 'documents', method: 'POST', body }),
      invalidatesTags: ['Document'],
    }),
    updateDocument: build.mutation<DocumentItem, { id: string; kind?: DocumentKind; deviceId?: string | null }>({
      query: ({ id, ...body }) => ({ url: `documents/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Document', { type: 'Device', id: 'LIST' }, { type: 'LuxuryItem', id: 'LIST' }],
    }),
    recognizeDocument: build.mutation<ReceiptExtraction, string>({
      query: (id) => ({ url: `documents/${id}/recognize`, method: 'POST' }),
    }),
    identifyDocument: build.mutation<ItemIdentification, string>({
      query: (id) => ({ url: `documents/${id}/identify`, method: 'POST' }),
    }),
    /** Suche per Foto: the photo at storagePath is deleted by the server afterwards. */
    describePhoto: build.mutation<ItemIdentification, { storagePath: string }>({
      query: (body) => ({ url: 'documents/describe-photo', method: 'POST', body }),
    }),
    getDocumentUrl: build.query<{ url: string; expiresIn: number }, string>({
      query: (id) => `documents/${id}/url`,
      // Signed URLs live 10 minutes; drop them from the cache a bit earlier.
      keepUnusedDataFor: 5 * 60,
    }),
    deleteDocument: build.mutation<void, string>({
      query: (id) => ({ url: `documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Document', { type: 'Device', id: 'LIST' }, { type: 'LuxuryItem', id: 'LIST' }],
    }),

    getReminderSettings: build.query<ReminderSettings, void>({
      query: () => 'reminders/settings',
      providesTags: ['ReminderSettings'],
    }),
    updateReminderSettings: build.mutation<ReminderSettings, ReminderSettings>({
      query: (body) => ({ url: 'reminders/settings', method: 'PUT', body }),
      // The server rebuilds the pending reminders.
      invalidatesTags: ['ReminderSettings', 'Reminder'],
    }),

    getWarrantyRequests: build.query<WarrantyRequest[], void>({
      query: () => 'warranty-requests',
      providesTags: ['WarrantyRequest'],
    }),
    createWarrantyRequest: build.mutation<WarrantyRequest, CreateWarrantyRequest>({
      query: (body) => ({ url: 'warranty-requests', method: 'POST', body }),
      invalidatesTags: ['WarrantyRequest'],
    }),

    getLuxuryItems: build.query<LuxuryItem[], void>({
      query: () => 'luxury-items',
      providesTags: (result) => [
        { type: 'LuxuryItem', id: 'LIST' },
        ...(result ?? []).map((i) => ({ type: 'LuxuryItem' as const, id: i.id })),
      ],
    }),
    getLuxuryItem: build.query<LuxuryItem, string>({
      query: (id) => `luxury-items/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'LuxuryItem', id }],
    }),
    createLuxuryItem: build.mutation<LuxuryItem, LuxuryItemInput>({
      query: (body) => ({ url: 'luxury-items', method: 'POST', body }),
      invalidatesTags: [{ type: 'LuxuryItem', id: 'LIST' }, 'Document'],
    }),
    updateLuxuryItem: build.mutation<LuxuryItem, { id: string; photoOrder?: string[] } & Partial<LuxuryItemInput>>({
      query: ({ id, ...body }) => ({ url: `luxury-items/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'LuxuryItem', id }, { type: 'LuxuryItem', id: 'LIST' }, 'Document'],
    }),
    deleteLuxuryItem: build.mutation<void, string>({
      query: (id) => ({ url: `luxury-items/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'LuxuryItem', id: 'LIST' }, 'Document'],
    }),
    requestLuxuryInsurance: build.mutation<LuxuryItem, { id: string; message?: string }>({
      query: ({ id, ...body }) => ({ url: `luxury-items/${id}/insurance-request`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'LuxuryItem', id }, { type: 'LuxuryItem', id: 'LIST' }, 'WarrantyRequest'],
    }),

    estimateMarketValue: build.mutation<MarketValueEstimate, { id: string; language: string }>({
      query: ({ id, ...body }) => ({ url: `luxury-items/${id}/market-value`, method: 'POST', body }),
    }),

    getReminders: build.query<Reminder[], void>({
      query: () => 'reminders',
      providesTags: ['Reminder'],
    }),
    registerPushToken: build.mutation<void, { token: string; platform: 'ios' | 'android' | 'web' }>({
      query: (body) => ({ url: 'push-tokens', method: 'PUT', body }),
    }),
    unregisterPushToken: build.mutation<void, string>({
      query: (token) => ({ url: `push-tokens/${encodeURIComponent(token)}`, method: 'DELETE' }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useAcceptTermsMutation,
  useDeleteAccountMutation,
  useGetDevicesQuery,
  useGetDeviceQuery,
  useCreateDeviceMutation,
  useUpdateDeviceMutation,
  useDeleteDeviceMutation,
  useGetDocumentsQuery,
  useCreateUploadUrlMutation,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useRecognizeDocumentMutation,
  useIdentifyDocumentMutation,
  useDescribePhotoMutation,
  useGetDocumentUrlQuery,
  useDeleteDocumentMutation,
  useGetReminderSettingsQuery,
  useUpdateReminderSettingsMutation,
  useGetWarrantyRequestsQuery,
  useCreateWarrantyRequestMutation,
  useGetLuxuryItemsQuery,
  useGetLuxuryItemQuery,
  useCreateLuxuryItemMutation,
  useUpdateLuxuryItemMutation,
  useDeleteLuxuryItemMutation,
  useRequestLuxuryInsuranceMutation,
  useEstimateMarketValueMutation,
  useGetRemindersQuery,
  useRegisterPushTokenMutation,
  useUnregisterPushTokenMutation,
} = api;
