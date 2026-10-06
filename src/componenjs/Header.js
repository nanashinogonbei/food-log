"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactRouterDom = require("react-router-dom");
var _clerkReact = require("@clerk/clerk-react");
function Header() {
  const {
    user
  } = (0, _clerkReact.useUser)();
  return <header id="l-header">
      <_reactRouterDom.Link className="logo" to="/">もぐログ</_reactRouterDom.Link>
      <nav className="site-header__nav">
        <_clerkReact.SignedOut>
          <a href="/login.html">ログイン</a>
        </_clerkReact.SignedOut>
        <_clerkReact.SignedIn>
          {user && <_reactRouterDom.Link to={`/${user.id}`}>マイページ</_reactRouterDom.Link>}
          <_clerkReact.UserButton />
        </_clerkReact.SignedIn>
      </nav>
    </header>;
}
var _default = exports.default = Header;