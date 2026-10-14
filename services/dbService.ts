
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, setDoc } from "firebase/firestore";
import { Job, CandidateInput } from "../types";

// --- JOBS COLLECTION ---
const JOBS_COLLECTION = "jobs";

export const fetchJobsFromDB = async (): Promise<Job[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, JOBS_COLLECTION), orderBy("postedDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return [];
  }
};

export const addJobToDB = async (job: Omit<Job, "id">): Promise<Job> => {
  if (!db) throw new Error("Database connection not available");
  try {
    const docRef = await addDoc(collection(db, JOBS_COLLECTION), job);
    return { id: docRef.id, ...job };
  } catch (error) {
    console.error("Error adding job:", error);
    throw error;
  }
};

export const updateJobInDB = async (job: Job) => {
  if (!db) return;
  try {
    const jobRef = doc(db, JOBS_COLLECTION, job.id);
    await updateDoc(jobRef, { ...job });
  } catch (error) {
    console.error("Error updating job:", error);
    throw error;
  }
};

export const deleteJobFromDB = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, JOBS_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting job:", error);
    throw error;
  }
};

// --- CANDIDATES COLLECTION ---
// Firestore rejects undefined values, File objects and other browser-only data.
// Keep unsaved UI status and uploaded documents out of database writes.
const toCandidateDocument = (candidate: CandidateInput) => {
  const { cvFile, appFormFile, id, saveIssue, ...candidateData } = candidate;
  return JSON.parse(JSON.stringify(candidateData));
};

// --- CANDIDATES COLLECTION ---
const CANDIDATES_COLLECTION = "candidates";

export const fetchCandidatesFromDB = async (): Promise<CandidateInput[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, CANDIDATES_COLLECTION)); 
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        cvFile: null, 
        appFormFile: null,
        logs: data.logs || [],
        stage: data.stage || 'New',
        status: data.status || 'idle'
      } as CandidateInput;
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return [];
  }
};

export const addCandidateToDB = async (candidate: CandidateInput): Promise<string> => {
  if (!db) throw new Error("Database connection not available");
  try {
    const candidateData = toCandidateDocument(candidate);
    const docRef = await addDoc(collection(db, CANDIDATES_COLLECTION), {
      ...candidateData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding candidate:", error);
    throw error;
  }
};

export const updateCandidateInDB = async (candidate: CandidateInput) => {
  if (!db) throw new Error("Database connection not available");
  try {
    // Temporary slots must be created via addCandidateToDB, not updated.
    if (!candidate.id || candidate.id.includes('-') || candidate.id.length < 15) {
      // Pending entries are created separately via addCandidateToDB.
      return;
    }
    const candidateData = toCandidateDocument(candidate);
    const candidateRef = doc(db, CANDIDATES_COLLECTION, candidate.id);
    await setDoc(candidateRef, candidateData, { merge: true });
  } catch (error) {
    console.error("Error updating candidate:", error);
    // Propagate the Firestore failure so UI does not report a false success.
    throw error;
  }
};

export const deleteCandidateFromDB = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, CANDIDATES_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting candidate:", error);
    throw error;
  }
};
