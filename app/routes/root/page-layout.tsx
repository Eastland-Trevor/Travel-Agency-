import {Outlet, redirect, useNavigate} from "react-router";
import {getCurrentAccount, getExistingUser, logoutUser, storeUserData} from "~/appwrite/auth";
import RootNavbar from "../../../components/RootNavbar";

export async function clientLoader() {
    try {
        const user = await getCurrentAccount();

        if(!user.$id) return redirect('/sign-in');

        const existingUser = await getExistingUser(user.$id);
        return existingUser?.$id ? existingUser : await storeUserData();
    } catch (e) {
        console.log('Error fetching user', e)
        return redirect('/sign-in')
    }
}

const PageLayout = () => {
    return (
        <div className="bg-light-200">
            <RootNavbar />
            <Outlet />
        </div>
    )
}
export default PageLayout
