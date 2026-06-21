import type { AudiovisualProject } from "../types/audiovisual.types";

const img = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80";
const ref1 = "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=160&q=80";
const ref2 = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=160&q=80";
const ref3 = "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=160&q=80";


export const audiovisualMusicCatalog = [
  { id: "music-001", title: "Automotivo Pesado", primaryArtist: "DJ Stay", isrc: "BR-LDR-24-00001", version: "Original" },
  { id: "music-002", title: "Fuga na Madrugada", primaryArtist: "MC Levin", isrc: "BR-LDR-24-00002", version: "Original" },
  { id: "music-003", title: "De Rolê na Quebrada", primaryArtist: "MC Tuto", isrc: "BR-LDR-24-00003", version: "Original" },
  { id: "music-004", title: "Vida de Artista", primaryArtist: "MC Ryan SP", isrc: "BR-LDR-24-00004", version: "Original" },
  { id: "music-005", title: "Pressão Máxima", primaryArtist: "DJ Gui7", isrc: "BR-LDR-24-00005", version: "Original" },
  { id: "music-006", title: "Noite de Lançamento", primaryArtist: "Lander Records", isrc: "BR-LDR-24-00006", version: "Single" },
];

export const audiovisualMockProjects: AudiovisualProject[] = [
  { id:"1", code:"AV-2024-0012", music_title:"Automotivo Pesado", artist_name:"DJ Stay", type:"music_video", format:"16:9", shooting_date:"2024-05-25", director:"Gabriel Martins", videomaker:"Lucas Araujo", editor:"Pedro Editor", capture_status:"recorded", editing_status:"editing", approval_status:"review", pre_release_date:"2024-06-20", release_date:"2024-06-27", budget:8500, real_cost:6300, status:"production", priority:"high", final_status:"production", campaign_name:"Lançamento Automotivo 2024", created_by_name:"John Manager", created_at:"2024-05-10T14:30:00", location:"São Paulo - SP", thumbnail_url:img, concept:"Clipe automotivo com performance do artista em cenários urbanos e carros esportivos.", objective:"Transmitir energia, velocidade e lifestyle do artista.", references:[ref1,ref2,ref3,ref1,ref2,ref3], moodboard:[ref3,ref2,ref1,ref3,ref2,ref1,ref3,ref2], observations:"Gravação noturna. Levar iluminação portátil. Confirmar autorização de locação na favela." },
  { id:"2", code:"AV-2024-0011", music_title:"Fuga na Madrugada", artist_name:"MC Levin", type:"reels", format:"9:16", shooting_date:"2024-05-18", director:"Caio Ferreira", videomaker:"Caio Ferreira", editor:"Julia Costa", capture_status:"recorded", editing_status:"finished", approval_status:"approved", pre_release_date:"2024-06-15", release_date:"2024-06-15", budget:1800, real_cost:1500, status:"delivered", priority:"normal", final_status:"finished", location:"Rio de Janeiro - RJ" },
  { id:"3", code:"AV-2024-0010", music_title:"De Rolê na Quebrada", artist_name:"MC Tuto", type:"teaser", format:"9:16", shooting_date:"2024-05-20", director:"Gabriel Martins", videomaker:"Lucas Araujo", editor:"Pedro Editor", capture_status:"scheduled", editing_status:"not_started", approval_status:"pending", pre_release_date:"2024-06-05", release_date:"2024-06-12", budget:1200, status:"draft", priority:"normal", final_status:"planned" },
  { id:"4", code:"AV-2024-0009", music_title:"Vida de Artista", artist_name:"MC Ryan SP", type:"backstage", format:"9:16", shooting_date:"2024-05-15", director:"Caio Ferreira", videomaker:"Caio Ferreira", editor:"Julia Costa", capture_status:"recorded", editing_status:"finished", approval_status:"approved", pre_release_date:"2024-06-10", release_date:"2024-06-10", budget:900, status:"published", priority:"low", final_status:"published" },
  { id:"5", code:"AV-2024-0008", music_title:"Pressão Máxima", artist_name:"DJ Gui7", type:"visualizer", format:"16:9", shooting_date:"2024-05-22", director:"Rafael Costa", videomaker:"Rafael Costa", editor:"Pedro Editor", capture_status:"recording", editing_status:"not_started", approval_status:"pending", pre_release_date:"2024-06-25", release_date:"2024-07-02", budget:2100, status:"production", priority:"high", final_status:"production" },
];

export const defaultScenes = [
  { id:"c1", scene:"01", environment:"Rua noturna", description:"Artista em frente ao carro, início da música", participants:"Artista, Carro", shot_type:"Plano médio", camera_movement:"Slow Push", estimated_duration:"8s", status:"Planejada" },
  { id:"c2", scene:"02", environment:"Interior do carro", description:"Artista dirigindo, perfil", participants:"Artista", shot_type:"Close", camera_movement:"Tracking", estimated_duration:"6s", status:"Planejada" },
  { id:"c3", scene:"03", environment:"Rua / Pista", description:"Carro andando em movimento", participants:"Carro", shot_type:"Plano aberto", camera_movement:"Drone", estimated_duration:"10s", status:"Planejada" },
  { id:"c4", scene:"04", environment:"Favela", description:"Artista com a equipe na comunidade", participants:"Artista, Equipe", shot_type:"Plano geral", camera_movement:"Handheld", estimated_duration:"12s", status:"Planejada" },
  { id:"c5", scene:"05", environment:"Cobertura", description:"Vista da cidade + carros", participants:"Carros", shot_type:"Plano aberto", camera_movement:"Drone", estimated_duration:"8s", status:"Planejada" },
  { id:"c6", scene:"06", environment:"Estúdio", description:"Performance do artista", participants:"Artista", shot_type:"Plano médio", camera_movement:"Estático", estimated_duration:"10s", status:"Planejada" },
];

export const defaultShots = [
  { id:"s1", shot:"S01", shot_type:"Close", movement:"Slow Push", duration:"4s", status:"Planejado" },
  { id:"s2", shot:"S02", shot_type:"Plano Médio", movement:"Tracking", duration:"6s", status:"Planejado" },
  { id:"s3", shot:"S03", shot_type:"Plano Aberto", movement:"Drone", duration:"8s", status:"Planejado" },
  { id:"s4", shot:"S04", shot_type:"Detalhe", movement:"Tilt", duration:"3s", status:"Planejado" },
  { id:"s5", shot:"S05", shot_type:"Plano Geral", movement:"Handheld", duration:"7s", status:"Planejado" },
];

export const recordingChecklistLabels = ["Câmera Principal","Lentes","Iluminação","Microfone","Bateria Extra","Cartão de Memória","Tripé / Gimbal","Props / Figurino"];

export const defaultChecklist = recordingChecklistLabels.map((label, index) => ({ id: String(index), label, checked: true }));

// Aliases consumed by AudiovisualProductionWorkspace (storyboard / shot list / checklist).
export const storyboardRows = defaultScenes;
export const shotRows = defaultShots;
export const checklistItems = recordingChecklistLabels;


