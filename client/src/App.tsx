import {BrowserRouter, Route, Routes} from "react-router-dom"
import {EntryPage} from "@pages/ChatPage/Entry.tsx";

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/*<Route path="/" element={<ChatPage/>}/>*/}
                <Route path="/" element={<EntryPage/>}/>
            </Routes>
        </BrowserRouter>
    )
}

export default App