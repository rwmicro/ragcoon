#!/usr/bin/env node

/**
 * 🚀 Script pour créer un modèle RAG de test avec la configuration correcte
 */

const fs = require('fs').promises;

async function createTestDocument() {
    // Créer un document de test en kabyle
    const testContent = `
# Guide Kabyle - Maison et Famille

## Axxam (Maison)
- **Axxam** : Maison, foyer
- **Taqcict** : Chambre
- **Tiklit** : Cuisine
- **Asif** : Rivière près de la maison
- **Adabu** : Porte d'entrée

## Tawacult (Famille)
- **Yemma** : Maman
- **Baba** : Papa
- **Gma** : Frère
- **Ultma** : Sœur
- **Jeddi** : Grand-père
- **Nanna** : Grand-mère

## Expressions Utiles
- **Azul fellawen** : Bonjour (salutation)
- **Tanemmirt** : Merci
- **Saha** : Au revoir
- **Amek telliḍ?** : Comment allez-vous ?
- **Anda tezgaḍ?** : Où habitez-vous ?

## Architecture Traditionnelle
Les maisons kabyles traditionnelles (axxam) sont construites en pierre et en argile.
Elles comprennent généralement:
- Une cour centrale (ammas n uxxam)
- Des chambres autour de la cour
- Un toit en tuiles rouges
- Un jardin potager (agarbu)

## Vie Quotidienne
Dans une maison kabyle traditionnelle:
- On se réunit dans la cour pour les repas
- Les femmes préparent le couscous (seksu) dans la cuisine
- Les hommes reçoivent les invités dans la pièce principale
- Les enfants jouent dans la cour centrale
`;

    await fs.writeFile('/tmp/test-kabyle.md', testContent);
    return '/tmp/test-kabyle.md';
}

async function createRAGModel() {
    console.log('🚀 Création d\'un modèle RAG de test...\n');
    
    try {
        // 1. Créer le document de test
        console.log('📝 Création du document de test...');
        const filePath = await createTestDocument();
        console.log('✅ Document créé:', filePath);
        
        // 2. Instructions pour créer le modèle RAG
        console.log('\n🎯 Instructions pour créer le modèle RAG:');
        console.log('');
        console.log('1. Allez sur: http://localhost:3000');
        console.log('2. Créez un nouveau modèle RAG avec:');
        console.log('   - Nom: kabyle-test');
        console.log('   - Description: Modèle de test avec vocabulaire kabyle');
        console.log('   - Modèle de base: qwen3:8b');
        console.log('   - Modèle d\'embedding: bge-m3:latest');
        console.log(`   - Fichier: ${filePath}`);
        console.log('');
        console.log('3. Une fois créé, testez avec:');
        console.log('   npm run rag:test');
        console.log('');
        console.log('4. Ou testez directement avec:');
        console.log('   curl -X POST http://localhost:3000/api/rag/debug-search \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"modelName": "kabyle-test", "query": "Comment dire maison en kabyle?"}\'');
        console.log('');
        
        // 3. Contenu du document
        console.log('📋 Contenu du document de test:');
        console.log('-----------------------------------');
        const content = await fs.readFile(filePath, 'utf8');
        console.log(content.substring(0, 500) + '...');
        console.log('-----------------------------------');
        
        console.log('\n✅ Prêt pour les tests !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

if (require.main === module) {
    createRAGModel();
}

module.exports = { createRAGModel, createTestDocument };