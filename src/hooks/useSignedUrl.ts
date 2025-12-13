import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useSignedUrl');

// Cache for signed URLs to avoid re-fetching
const signedUrlCache = new Map<string, { url: string; expires: number }>();

export function useSignedUrl(publicUrl: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(null);
      return;
    }

    // Check cache first
    const cached = signedUrlCache.get(publicUrl);
    if (cached && cached.expires > Date.now()) {
      setSignedUrl(cached.url);
      return;
    }

    const fetchSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        // Extract file path from public URL
        // URL format: https://...supabase.co/storage/v1/object/public/assessment-media/{path}
        const urlParts = publicUrl.split('/assessment-media/');
        if (urlParts.length !== 2) {
          throw new Error('Invalid media URL format');
        }
        const filePath = urlParts[1];

        const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
          body: { filePath },
        });

        if (fnError) throw fnError;
        if (!data?.signedUrl) throw new Error('No signed URL returned');

        // Cache the URL for 14 minutes (signed URLs expire in 15 minutes)
        signedUrlCache.set(publicUrl, {
          url: data.signedUrl,
          expires: Date.now() + 14 * 60 * 1000,
        });

        setSignedUrl(data.signedUrl);
      } catch (err) {
        logger.error('Failed to get signed URL', err);
        setError(err instanceof Error ? err.message : 'Failed to get signed URL');
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [publicUrl]);

  return { signedUrl, loading, error };
}

// Hook for multiple URLs
export function useSignedUrls(publicUrls: string[]) {
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (publicUrls.length === 0) {
      setSignedUrls(new Map());
      return;
    }

    const fetchAllUrls = async () => {
      setLoading(true);
      const newSignedUrls = new Map<string, string>();
      const newErrors = new Map<string, string>();

      // Check cache first for each URL
      const urlsToFetch: string[] = [];
      for (const url of publicUrls) {
        const cached = signedUrlCache.get(url);
        if (cached && cached.expires > Date.now()) {
          newSignedUrls.set(url, cached.url);
        } else {
          urlsToFetch.push(url);
        }
      }

      // Fetch uncached URLs in parallel
      const fetchPromises = urlsToFetch.map(async (publicUrl) => {
        try {
          const urlParts = publicUrl.split('/assessment-media/');
          if (urlParts.length !== 2) {
            throw new Error('Invalid media URL format');
          }
          const filePath = urlParts[1];

          const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
            body: { filePath },
          });

          if (fnError) throw fnError;
          if (!data?.signedUrl) throw new Error('No signed URL returned');

          signedUrlCache.set(publicUrl, {
            url: data.signedUrl,
            expires: Date.now() + 14 * 60 * 1000,
          });

          return { publicUrl, signedUrl: data.signedUrl, error: null };
        } catch (err) {
          logger.error('Failed to get signed URL', err);
          return { 
            publicUrl, 
            signedUrl: null, 
            error: err instanceof Error ? err.message : 'Failed to get signed URL' 
          };
        }
      });

      const results = await Promise.all(fetchPromises);
      
      for (const result of results) {
        if (result.signedUrl) {
          newSignedUrls.set(result.publicUrl, result.signedUrl);
        } else if (result.error) {
          newErrors.set(result.publicUrl, result.error);
        }
      }

      setSignedUrls(newSignedUrls);
      setErrors(newErrors);
      setLoading(false);
    };

    fetchAllUrls();
  }, [publicUrls.join(',')]);

  return { signedUrls, loading, errors };
}
