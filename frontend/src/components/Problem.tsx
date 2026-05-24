//form fully not filled and the backend data gose but error


import { useState } from "react";
// import axios from "axios";


type ProblemProps = {
  open: boolean;
  setopen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Problem({ open , setopen}:ProblemProps){
    const [formdata, setformdata] = useState({
        problemname:"",
        description:"",
        urgency:false,
    })
    // const [picture, setpicture] = useState(null)
    // const [video, setvideo] = useState(null)
    
    const onhandler = (e:any)=>{
        const {name, value, type, checked} = e.target;

        // if(type ===  "file" && name === "picture"){
        //     console.log("work");
        //     if(files && files[0]){
        //     setpicture(files[0]);
        //     }
        //     return;
        // }

        // if(type === "file"  && name === "video"){
        //     if(files && files[0]){
        //         setvideo(files[0]);
        //     }
        //     return;
        // }
        setformdata((prev)=>{
            return{...prev, [name]:type === "checkbox" ? checked : value}
        })
    }
    // const onsub = async(e : React.FormEvent<HTMLFormElement>)=>{
    //     e.preventDefault();
    //     try{
    //         const data = new FormData();
    //         data.append("problemname", formdata.problemname);
    //         data.append("description", formdata.description);
    //         data.append("urgency",  String(formdata.urgency));
    //         if(picture){
    //             data.append("picture", picture);
    //         }
    //         if(video){
    //             data.append("video", video);
    //         }
    //         await axios.post(`http://localhost:8000/problem/createProblem`, data)
           
    //         setopen(false)
    //     }catch(err){
    //         console.log(err);
    //     }
    // }
    
    return(
    open && <section className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50">
        <div className="min-h-screen flex items-center justify-center">

            
            <form  className="relative  bg-gray-300 p-8 rounded-2xl w-full max-w-xl">

                <button onClick={()=>{
                    setopen(false)
                }} type="button" className="absolute top-4 right-4 text-2xl font-bold text-gray-600 w-12 h-12 transition-all flex items-center justify-center">
                    X
                </button>
                <h2 className="text-3xl font-bold">Raise Problem</h2>
                <div>
                    <label className="block mb-2 font-medium mt-5">Problem Name:</label>
                    <input type="text" onChange={onhandler} name="problemname" placeholder="Enter Problem Name" 
                    className="w-full border rounded-xl px-4 py-2 outline-none focus:border-blue-500" required={true}></input>
                </div>

                <div>
                    <label className="block mb-2 font-medium mt-5">Description:</label>
                    <input type="text"onChange={onhandler} name="description" placeholder="Enter Description" 
                    className="w-full border rounded-xl px-4 py-2 outline-none focus:border-blue-500" required={true}></input>
                </div>

  
                <div>
                    <label className="block mb-2 font-medium mt-5">Upload Picture:</label>
                    <input type="file" accept="image/*" name="picture" onChange={onhandler}
                    className="w-full border rounded-xl px-4 py-2 outline-none focus:border-blue-500" ></input>
                </div>

                <div>
                    <label className="block mb-2 font-medium mt-5">Upload Video:</label>
                    <input type="file" accept="video/*" name="video" onChange={onhandler}
                    className="w-full border rounded-xl px-4 py-2 outline-none focus:border-blue-500"></input>
                </div>
                <div className="flex items-center gap-3 mt-5">
                    <input type="checkbox" onChange={onhandler} name="urgency" checked={formdata.urgency} className="w-6 h-6"></input>
                    <label className="block  font-medium ">Urgent Problem</label>
                </div>

                <button type="submit" className="w-full bg-blue-900 text-white py-2 mt-5 rounded-4xl focus:bg-orange-500  hover:bg-blue-500 transition-all">
                submit
                </button>

            </form>
        </div>
    </section>
    )
}