import logo from "./logo.svg";
import "./App.css";
import { ModalProvider, modalCtrl } from "./modal";

export function delay(duration: number = 0) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, Math.max(duration, 0));
  });
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <button
          onClick={() => {
            modalCtrl.open(
              () => (
                <div className="bg-white w-[200px] h-[300px]">
                  "안녕하세요.1"
                </div>
              ),
              {
                backCoverOpacity: 0.5,
                backCoverColor: "#fff",
                closeDelay: 1000,
                stateResponsiveComponent: true,
                callback: async (confirm, { pending, success }) => {
                  pending();
                  await delay(1000);

                  success(() =>
                    modalCtrl.open(() => (
                      <div className="bg-white w-[200px] h-[300px]">새모달</div>
                    ))
                  );
                },
                duration: 300,
              }
            );
          }}
        >
          모달 열기
        </button>
        <button
          onClick={() => {
            modalCtrl.alert(async (confirm, { pending, success }) => {
              pending();
              await delay(1000);

              success(() => {
                modalCtrl.open(() => (
                  <div className="bg-white w-[200px] h-[300px]">새모달1</div>
                ));
                modalCtrl.open(() => (
                  <div className="bg-white w-[200px] h-[300px]">새모달2</div>
                ));
                modalCtrl.open(() => (
                  <div className="bg-white w-[200px] h-[300px]">새모달3</div>
                ));
                modalCtrl.open(() => (
                  <div className="bg-white w-[200px] h-[300px]">새모달4</div>
                ));
              });
            });
          }}
        >
          알림
        </button>
      </header>
      <div className="w-full h-[500px]"></div>
      <ModalProvider />
    </div>
  );
}

export default App;
