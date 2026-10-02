import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  Device,
  DeviceInput,
  DeviceStatus,
  DocumentItem,
  DocumentKind,
  DocumentMimeType,
  ReceiptExtraction,
  Reminder,
  UploadUrl,
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
  tagTypes: ['Device', 'Document', 'Reminder'],
  endpoints: (build) => ({
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
      invalidatesTags: [{ type: 'Device', id: 'LIST' }, 'Reminder'],
    }),
    updateDevice: build.mutation<Device, { id: string } & Partial<DeviceInput>>({
      query: ({ id, ...body }) => ({ url: `devices/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Device', id }, { type: 'Device', id: 'LIST' }, 'Reminder'],
    }),
    deleteDevice: build.mutation<void, string>({
      query: (id) => ({ url: `devices/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Device', id: 'LIST' }, 'Document', 'Reminder'],
    }),

    getDocuments: build.query<DocumentItem[], { deviceId?: string } | void>({
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
      invalidatesTags: ['Document', { type: 'Device', id: 'LIST' }],
    }),
    recognizeDocument: build.mutation<ReceiptExtraction, string>({
      query: (id) => ({ url: `documents/${id}/recognize`, method: 'POST' }),
    }),
    getDocumentUrl: build.query<{ url: string; expiresIn: number }, string>({
      query: (id) => `documents/${id}/url`,
      // Signed URLs live 10 minutes; drop them from the cache a bit earlier.
      keepUnusedDataFor: 5 * 60,
    }),
    deleteDocument: build.mutation<void, string>({
      query: (id) => ({ url: `documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Document', { type: 'Device', id: 'LIST' }],
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
  useGetDocumentUrlQuery,
  useDeleteDocumentMutation,
  useGetRemindersQuery,
  useRegisterPushTokenMutation,
  useUnregisterPushTokenMutation,
} = api;
