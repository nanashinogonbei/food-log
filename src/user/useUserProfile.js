"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useCurrentUserProfile = useCurrentUserProfile;
var _react = require("react");
var _clerkReact = require("@clerk/clerk-react");
var _data = require("./data.ts");
// ClerkのユーザーIDごとにプロフィール取得をキャッシュする（ヘッダー・各ページで同時に使っても取得は1回）
const profileRequests = new Map();
function loadUserProfile(clerkUserId) {
  let request = profileRequests.get(clerkUserId);
  if (!request) {
    request = (0, _data.fetchUserProfile)(clerkUserId);
    profileRequests.set(clerkUserId, request);
    // 失敗した場合は次回また取得し直せるようにする
    request.catch(() => profileRequests.delete(clerkUserId));
  }
  return request;
}
/**
 * ログイン中ユーザーのサイト用プロフィール（公開用ID・表示名）を取得する。
 * URLにはClerkのIDではなく、ここで得られる公開用ID(publicId)を使う。
 * 初回は公開用IDが自動で発行される。
 */
function useCurrentUserProfile() {
  const {
    user,
    isLoaded
  } = (0, _clerkReact.useUser)();
  const clerkUserId = user?.id;
  const [result, setResult] = (0, _react.useState)(null);
  (0, _react.useEffect)(() => {
    if (!clerkUserId) {
      return;
    }
    let isMounted = true;
    loadUserProfile(clerkUserId).then(profile => {
      if (isMounted) {
        setResult({
          clerkUserId,
          profile
        });
      }
    }).catch(err => {
      if (isMounted) {
        setResult({
          clerkUserId,
          error: err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました'
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [clerkUserId]);

  // ログアウト・ユーザー切り替え後に前のユーザーの結果を使わない
  const current = result && result.clerkUserId === clerkUserId ? result : null;
  return {
    profile: current?.profile ?? null,
    isLoading: !isLoaded || clerkUserId !== undefined && current === null,
    error: current?.error ?? null
  };
}