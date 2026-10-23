import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Chạy một hàm bất đồng bộ và theo dõi ba trạng thái: loading · error · data.
 * @param {() => Promise<any>} fn Hàm gọi API (thường từ src/api/*.api.js).
 * @param {any[]} deps Chạy lại khi các giá trị này đổi.
 * @returns {{data: any, error: import('../api/client').ApiError|null, loading: boolean, reload: () => void}}
 */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const callId = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const load = useCallback(() => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    run().then(
      (data) => { if (id === callId.current) setState({ data, error: null, loading: false }); },
      (error) => { if (id === callId.current) setState({ data: null, error, loading: false }); },
    );
  }, [run]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}
