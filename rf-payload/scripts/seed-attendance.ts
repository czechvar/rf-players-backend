import { getPayload } from 'payload'
import config from '../src/payload.config'

async function seed() {
  const payload = await getPayload({ config })

  try {
    console.log('Starting seed process...')

    // Check if we have any users
    const usersCount = await payload.count({ collection: 'users' })
    console.log(`Found ${usersCount.totalDocs} users`)

    // Check if we have any events
    const eventsCount = await payload.count({ collection: 'events' })
    console.log(`Found ${eventsCount.totalDocs} events`)

    // Check if we have any attendance records
    const attendanceCount = await payload.count({ collection: 'attendance' })
    console.log(`Found ${attendanceCount.totalDocs} attendance records`)

    // If we have events but no attendance records, create them
    if (eventsCount.totalDocs > 0 && attendanceCount.totalDocs === 0) {
      console.log('Creating missing attendance records...')
      
      // Get all events
      const events = await payload.find({
        collection: 'events',
        limit: 100,
      })

      // Get all players
      const players = await payload.find({
        collection: 'users',
        where: {
          and: [
            { role: { equals: 'player' } },
            { active: { equals: true } }
          ]
        },
        limit: 100,
      })

      console.log(`Found ${events.docs.length} events and ${players.docs.length} players`)

      // Create attendance records for each event-player combination
      let created = 0
      for (const event of events.docs) {
        for (const player of players.docs) {
          try {
            await payload.create({
              collection: 'attendance',
              data: {
                eventId: event.id,
                playerId: player.id,
                status: 'pending',
                updatedBy: player.id, // Use player as initial updater
                updatedAt: new Date().toISOString(),
              },
            })
            created++
          } catch (error) {
            console.error(`Failed to create attendance for event ${event.id}, player ${player.id}:`, error)
          }
        }
      }

      console.log(`Created ${created} attendance records`)
    }

    console.log('Seed process completed!')
  } catch (error) {
    console.error('Seed process failed:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

seed()