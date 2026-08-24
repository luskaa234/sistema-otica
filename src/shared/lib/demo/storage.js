// Réplica mínima de supabase.storage para o modo demo: gera uma object URL
// local a partir do próprio arquivo enviado, sem nenhuma rede envolvida —
// a foto/logo enviada aparece de verdade na tela, só que só nesta aba.
const urlPorCaminho = new Map()

export const demoStorage = {
  from(_bucket) {
    return {
      async upload(caminho, arquivo) {
        if (arquivo instanceof Blob) {
          urlPorCaminho.set(caminho, URL.createObjectURL(arquivo))
        }
        return { data: { path: caminho }, error: null }
      },
      getPublicUrl(caminho) {
        return { data: { publicUrl: urlPorCaminho.get(caminho) ?? caminho } }
      },
    }
  },
}
