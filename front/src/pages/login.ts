import "../override.css";
import {
  ApiClient,
  asyncInit,
  query as q,
  LoaderButton,
  Navigation,
} from "../common.ts";

asyncInit(async () => {
  try {
    const userInfo = await ApiClient.getUserInfo();
    console.log("already logged in!", userInfo);
    Navigation.redirectToMain();
    return;
  } catch (err) {
    console.error(err);
  }

  const loginInput: HTMLInputElement = q("#login-input");
  const passowrdInput: HTMLInputElement = q("#password-input");
  const button = new LoaderButton("login");

  async function onLogin() {
    const userData = await ApiClient.auth(
      loginInput.value,
      passowrdInput.value
    );
    console.log("userData:", userData);
    Navigation.redirectToMain();
  }

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key == "Enter") {
      onLogin();
    }
  }

  button.onClick = onLogin;
  loginInput.onkeydown = onKeyDown;
  passowrdInput.onkeydown = onKeyDown;
});
